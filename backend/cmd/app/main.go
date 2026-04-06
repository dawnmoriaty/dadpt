package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"backend/configs"
	"backend/db"
	"backend/di"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/infrastructure/messaging"
	kafka_consumer "backend/internals/booking/infrastructure/messaging/kafka/consumer"
	rmq_consumer "backend/internals/booking/infrastructure/messaging/rabbitmq/consumer"
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	httpServer "backend/internals/server/http"
	"backend/pkgs/kafka"
	"backend/pkgs/logger"
	"backend/pkgs/messaging/outbox"
	rmq_config "backend/pkgs/messaging/rabbitmq"
	"backend/pkgs/rabbitmq"
)

func main() {
	sseHub := infrastructure.NewSSEHub()

	container, err := di.NewContainer(sseHub)
	if err != nil {
		logger.Fatal("Failed to create DI container: ", err)
	}

	err = container.Invoke(func(
		server *httpServer.Server,
		cfg *configs.Config,
		database *db.Database,
		rmq rabbitmq.IRabbitMQ,
		kafkaClient kafka.IKafka,
		kafkaRegistry *kafka.Registry,
	) {
		logger.Info("Starting Bus Ticketing Backend...")

		ctx, cancel := context.WithCancel(context.Background())


		if err := rmq_config.SetupRabbitMQTopology(rmq); err != nil {
			logger.Error("Failed to setup central RabbitMQ topology: %v", err)
		}

		if kafkaClient != nil {
			topics := kafkaRegistry.All()
			if err := kafkaClient.EnsureTopics(ctx, topics); err != nil {
				logger.Error("Failed to ensure Kafka topics: %v", err)
			} else {
				logger.Info("Kafka topics ensured successfully (count=%d)", len(topics))
			}
		}

		outboxRepo := repository.NewOutboxRepository(database)
		outboxAdapter := messaging.NewOutboxAdapter(outboxRepo)
		outboxProcessor := outbox.NewProcessor(outboxAdapter, rmq, kafkaClient)
		go outboxProcessor.Start(ctx)

		bookingRepo := repository.NewBookingRepository(database)
		tripLocker := repository.NewTripLocker(database)
		expiryWorker := usecase.NewExpiryWorker(bookingRepo, tripLocker, outboxRepo)
		go expiryWorker.Start(ctx)

		adminRMQConsumer := rmq_consumer.NewRefundNotificationConsumer(rmq, sseHub)
		go adminRMQConsumer.Start(ctx)

		adminKafkaConsumer := kafka_consumer.NewBookingNotificationConsumer(kafkaClient, sseHub)
		go adminKafkaConsumer.Start(ctx)

		go func() {
			quit := make(chan os.Signal, 1)
			signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
			<-quit
			logger.Info("Shutting down...")
			cancel() // Stop background workers
			if rmq != nil {
				rmq.Close()
			}
			if kafkaClient != nil {
				if err := kafkaClient.Close(); err != nil {
					logger.Warn("Failed to close Kafka client: %v", err)
				}
			}
			database.Close()
			os.Exit(0)
		}()

		if err := server.Run(); err != nil {
			logger.Fatal("Server error: ", err)
		}
	})

	if err != nil {
		logger.Fatal("Startup failed: ", err)
	}
}

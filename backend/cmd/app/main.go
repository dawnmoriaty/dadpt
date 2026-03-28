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
	// Create SSE hub (shared between server and consumer)
	sseHub := infrastructure.NewSSEHub()

	// Create DI container
	container, err := di.NewContainer(sseHub)
	if err != nil {
		logger.Fatal("Failed to create DI container: ", err)
	}

	// Run with injected dependencies
	err = container.Invoke(func(
		server *httpServer.Server,
		cfg *configs.Config,
		database *db.Database,
		rmq rabbitmq.IRabbitMQ,
		kafkaClient kafka.IKafka,
		kafkaRegistry *kafka.Registry,
	) {
		logger.Info("Starting Bus Ticketing Backend...")

		// Context for background workers — cancelled on SIGINT/SIGTERM
		ctx, cancel := context.WithCancel(context.Background())

		// =====================================================================
		// BACKGROUND WORKERS
		// =====================================================================

		// Setup RabbitMQ topology for refund events via central messaging
		if err := rmq_config.SetupRabbitMQTopology(rmq); err != nil {
			logger.Error("Failed to setup central RabbitMQ topology: %v", err)
			// Continue without RabbitMQ — degraded mode
		}

		// Ensure all registered Kafka topics exist
		if kafkaClient != nil {
			topics := kafkaRegistry.All()
			if err := kafkaClient.EnsureTopics(ctx, topics); err != nil {
				logger.Error("Failed to ensure Kafka topics: %v", err)
			} else {
				logger.Info("Kafka topics ensured successfully (count=%d)", len(topics))
			}
		}

		// Start Generic Outbox Processor
		outboxRepo := repository.NewOutboxRepository(database)
		outboxAdapter := messaging.NewOutboxAdapter(outboxRepo)
		outboxProcessor := outbox.NewProcessor(outboxAdapter, rmq, kafkaClient)
		go outboxProcessor.Start(ctx)

		// Start booking expiry worker (checks expired pending bookings every 60s)
		bookingRepo := repository.NewBookingRepository(database)
		tripLocker := repository.NewTripLocker(database)
		expiryWorker := usecase.NewExpiryWorker(bookingRepo, tripLocker, outboxRepo)
		go expiryWorker.Start(ctx)

		// Start Admin Consumers (SSE Hub broadcast)
		adminRMQConsumer := rmq_consumer.NewRefundNotificationConsumer(rmq, sseHub)
		go adminRMQConsumer.Start(ctx)

		adminKafkaConsumer := kafka_consumer.NewBookingNotificationConsumer(kafkaClient, sseHub)
		go adminKafkaConsumer.Start(ctx)

		// =====================================================================
		// GRACEFUL SHUTDOWN
		// =====================================================================
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

		// Run HTTP server (blocking)
		if err := server.Run(); err != nil {
			logger.Fatal("Server error: ", err)
		}
	})

	if err != nil {
		logger.Fatal("Startup failed: ", err)
	}
}

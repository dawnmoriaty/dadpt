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
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	httpServer "backend/internals/server/http"
	"backend/pkgs/kafka"
	"backend/pkgs/logger"
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
	) {
		logger.Info("Starting Bus Ticketing Backend...")

		// Context for background workers — cancelled on SIGINT/SIGTERM
		ctx, cancel := context.WithCancel(context.Background())

		// =====================================================================
		// BACKGROUND WORKERS
		// =====================================================================

		// Setup RabbitMQ topology for booking events
		if err := infrastructure.SetupBookingTopology(rmq); err != nil {
			logger.Error("Failed to setup booking RabbitMQ topology: %v", err)
			// Continue without RabbitMQ — degraded mode
		}

		if kafkaClient != nil {
			topics := infrastructure.BookingKafkaTopics(cfg)
			if err := kafkaClient.EnsureTopics(ctx, topics); err != nil {
				logger.Error("Failed to ensure Kafka topics: %v", err)
			} else {
				logger.Info("Kafka topics ensured successfully")
			}
		}

		// Start outbox processor (polls outbox_events → publishes to RabbitMQ)
		outboxRepo := repository.NewOutboxRepository(database)
		outboxProcessor := infrastructure.NewOutboxProcessor(outboxRepo, rmq)
		go outboxProcessor.Start(ctx)

		// Start booking expiry worker (checks expired pending bookings every 60s)
		bookingRepo := repository.NewBookingRepository(database)
		tripLocker := repository.NewTripLocker(database)
		expiryWorker := usecase.NewExpiryWorker(bookingRepo, tripLocker, outboxRepo)
		go expiryWorker.Start(ctx)

		// Start admin booking event consumer (RabbitMQ → SSE hub for admin notifications)
		adminEventConsumer := infrastructure.NewAdminBookingEventConsumer(rmq, sseHub)
		go adminEventConsumer.Start(ctx)

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

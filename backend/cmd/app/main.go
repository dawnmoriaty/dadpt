package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"backend/db"
	"backend/di"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	httpServer "backend/internals/server/http"
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"
)

func main() {
	// Create DI container
	container, err := di.NewContainer()
	if err != nil {
		logger.Fatal("Failed to create DI container: ", err)
	}

	// Run with injected dependencies
	err = container.Invoke(func(
		server *httpServer.Server,
		database *db.Database,
		rmq rabbitmq.IRabbitMQ,
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

		// Start outbox processor (polls outbox_events → publishes to RabbitMQ)
		outboxRepo := repository.NewOutboxRepository(database)
		outboxProcessor := infrastructure.NewOutboxProcessor(outboxRepo, rmq)
		go outboxProcessor.Start(ctx)

		// Start booking expiry worker (checks expired pending bookings every 60s)
		bookingRepo := repository.NewBookingRepository(database)
		tripLocker := repository.NewTripLocker(database)
		expiryWorker := usecase.NewExpiryWorker(bookingRepo, tripLocker, outboxRepo)
		go expiryWorker.Start(ctx)

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

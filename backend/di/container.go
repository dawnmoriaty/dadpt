package di

import (
	"fmt"

	"go.uber.org/dig"

	"backend/configs"
	"backend/db"
	authHttp "backend/internals/auth/controller/http"
	authInfra "backend/internals/auth/infrastructure"
	authRepo "backend/internals/auth/repository"
	authUc "backend/internals/auth/usecase"
	busHttp "backend/internals/bus/controller/http"
	busRepo "backend/internals/bus/repository"
	busUc "backend/internals/bus/usecase"
	bustypeHttp "backend/internals/bustype/controller/http"
	bustypeRepo "backend/internals/bustype/repository"
	bustypeUc "backend/internals/bustype/usecase"
	locationHttp "backend/internals/locations/controller/http"
	locationRepo "backend/internals/locations/repository"
	locationUc "backend/internals/locations/usecase"
	providerHttp "backend/internals/providers/controller/http"
	providerRepo "backend/internals/providers/repository"
	providerUc "backend/internals/providers/usecase"
	httpServer "backend/internals/server/http"
	tripHttp "backend/internals/trip/controller/http"
	tripRepo "backend/internals/trip/repository"
	tripUc "backend/internals/trip/usecase"
	uploadHttp "backend/internals/upload/controller/http"
	"backend/pkgs/jwt"
	"backend/pkgs/logger"
	"backend/pkgs/minio"
	"backend/pkgs/rabbitmq"
	"backend/pkgs/redis"
)

// Container wraps dig.Container for dependency injection
type Container struct {
	*dig.Container
}

// NewContainer creates a new DI container with all dependencies registered
func NewContainer() (*Container, error) {
	c := dig.New()

	// Register all providers
	providers := []interface{}{
		// Config
		configs.LoadConfig,

		// Infrastructure
		provideDatabase,
		provideRedis,
		provideRabbitMQ,
		provideMinio,
		provideJWTProvider,

		// Auth Module
		authInfra.NewBcryptHasher,
		authRepo.NewAuthRepository,
		authUc.NewAuthUseCase,
		authHttp.NewAuthHandler,

		// Location Module
		locationRepo.NewLocationRepository,
		locationUc.NewLocationUseCase,
		locationHttp.NewLocationHandler,

		// Provider Module
		providerRepo.NewProviderRepository,
		providerUc.NewProviderUseCase,
		providerHttp.NewProviderHandler,

		// Trip Module
		tripRepo.NewTripRepository,
		tripUc.NewTripUseCase,
		tripHttp.NewTripHandler,

		// BusType Module
		bustypeRepo.NewBusTypeRepository,
		bustypeUc.NewBusTypeUseCase,
		bustypeHttp.NewBusTypeHandler,

		// Bus Module
		busRepo.NewBusRepository,
		busUc.NewBusUseCase,
		busHttp.NewBusHandler,

		// Upload Module
		uploadHttp.NewUploadHandler,

		// Server
		httpServer.NewServer,
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return nil, fmt.Errorf("failed to provide dependency: %w", err)
		}
	}

	// Initialize logger
	if err := c.Invoke(func(cfg *configs.Config) {
		logger.Initialize(cfg.Environment)
	}); err != nil {
		return nil, fmt.Errorf("failed to initialize logger: %w", err)
	}

	return &Container{Container: c}, nil
}

func provideDatabase(cfg *configs.Config) (*db.Database, error) {
	database, err := db.NewDatabase(cfg.DatabaseURI)
	if err != nil {
		return nil, fmt.Errorf("cannot connect to database: %w", err)
	}
	return database, nil
}

func provideRedis(cfg *configs.Config) redis.IRedis {
	client := redis.NewRedis(redis.Config{
		Address:  cfg.RedisURI,
		Password: cfg.RedisPassword,
		Database: cfg.RedisDB,
	})
	if client == nil {
		logger.Warn("Redis not connected")
	}
	return client
}

func provideRabbitMQ(cfg *configs.Config) *rabbitmq.RabbitMQ {
	if cfg.RabbitMQURI == "" {
		return nil
	}
	rmq, err := rabbitmq.NewRabbitMQ(cfg.RabbitMQURI)
	if err != nil {
		logger.Warn("RabbitMQ not connected: %v", err)
		return nil
	}
	return rmq
}

func provideMinio(cfg *configs.Config) *minio.MinioClient {
	if cfg.MinioEndpoint == "" {
		return nil
	}
	client, err := minio.NewMinioClient(
		cfg.MinioEndpoint,
		cfg.MinioAccessKey,
		cfg.MinioSecretKey,
		cfg.MinioBucket,
		cfg.MinioBaseURL,
		cfg.MinioUseSSL,
	)
	if err != nil {
		logger.Warn("MinIO not connected: %v", err)
		return nil
	}
	return client
}

func provideJWTProvider(cfg *configs.Config) jwt.JWTProvider {
	return jwt.NewJWTProvider(cfg.AuthSecret)
}

// Invoke runs a function with dependencies injected
func (c *Container) Invoke(fn interface{}) error {
	return c.Container.Invoke(fn)
}

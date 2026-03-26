package di

import (
	"fmt"

	"go.uber.org/dig"

	"backend/configs"
	"backend/db"
	aiagentHttp "backend/internals/aiagent/controller/http"
	authHttp "backend/internals/auth/controller/http"
	authInfra "backend/internals/auth/infrastructure"
	authRepo "backend/internals/auth/repository"
	authUc "backend/internals/auth/usecase"
	bookingHttp "backend/internals/booking/controller/http"
	bookingInfra "backend/internals/booking/infrastructure"
	bookingRepo "backend/internals/booking/repository"
	bookingUc "backend/internals/booking/usecase"
	locationRepo "backend/internals/location/repository"
	locationUc "backend/internals/location/usecase"
	paymentDomain "backend/internals/payment/domain"
	paymentInfra "backend/internals/payment/infrastructure"
	httpServer "backend/internals/server/http"
	tripRepo "backend/internals/trip/repository"
	tripUc "backend/internals/trip/usecase"
	uploadHttp "backend/internals/upload/controller/http"
	"backend/pkgs/aiagent"
	grpcpkg "backend/pkgs/grpc"
	"backend/pkgs/jwt"
	"backend/pkgs/kafka"
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
func NewContainer(sseHub *bookingInfra.SSEHub) (*Container, error) {
	c := dig.New()

	// Provide the SSE hub (created externally, shared between server and consumer)
	if err := c.Provide(func() *bookingInfra.SSEHub { return sseHub }); err != nil {
		return nil, fmt.Errorf("failed to provide SSE hub: %w", err)
	}

	// Register all providers
	providers := []interface{}{
		// Config
		configs.LoadConfig,

		// Infrastructure
		provideDatabase,
		provideRedis,
		provideRabbitMQ,
		provideKafka,
		provideMinio,
		provideJWTProvider,
		provideGRPCConn,
		providePaymentGateway,

		// Booking voice deps for AI pipeline proxy
		bookingRepo.NewBookingRepository,
		bookingRepo.NewTripLocker,
		bookingRepo.NewOutboxRepository,
		bookingRepo.NewPaymentRepository,
		bookingInfra.NewDistributedLock,
		bookingUc.NewBookingUseCase,
		locationRepo.NewLocationRepository,
		locationUc.NewLocationUseCase,
		tripRepo.NewTripRepository,
		tripUc.NewTripUseCase,
		bookingHttp.NewVoiceBookingHandler,

		// Auth Module
		authInfra.NewBcryptHasher,
		authRepo.NewAuthRepository,
		authUc.NewAuthUseCase,
		authHttp.NewAuthHandler,

		// AI Agent Module
		provideAIAgentClient,
		aiagentHttp.NewChatHandler,

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

func provideRabbitMQ(cfg *configs.Config) rabbitmq.IRabbitMQ {
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

func provideKafka(cfg *configs.Config) kafka.IKafka {
	if cfg == nil || !cfg.KafkaEnabled {
		return nil
	}

	client, err := kafka.NewKafka(kafka.Config{
		Enabled:  cfg.KafkaEnabled,
		Brokers:  kafka.ParseBrokers(cfg.KafkaBrokers),
		ClientID: cfg.KafkaClientID,
	})
	if err != nil {
		logger.Warn("Kafka not connected: %v", err)
		return nil
	}

	return client
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

func provideGRPCConn(cfg *configs.Config) *grpcpkg.Conn {
	conn, err := grpcpkg.Dial(grpcpkg.Config{
		Target:   cfg.AIAgentGRPCAddr,
		Insecure: true,
	})
	if err != nil {
		logger.Warn("gRPC connection failed: %v", err)
		return nil
	}
	return conn
}

func provideAIAgentClient(conn *grpcpkg.Conn) aiagent.Client {
	if conn == nil {
		logger.Warn("AI Agent not available: no gRPC connection")
		return nil
	}
	return aiagent.NewGRPCClient(conn)
}

func providePaymentGateway(cfg *configs.Config) paymentDomain.PaymentGateway {
	if cfg.PayOSClientID == "" || cfg.PayOSAPIKey == "" || cfg.PayOSChecksumKey == "" {
		return nil
	}
	adapter, err := paymentInfra.NewPayOSAdapter(cfg)
	if err != nil {
		logger.Warn("PayOS adapter not initialized in DI: %v", err)
		return nil
	}
	return adapter
}

func provideJWTProvider(cfg *configs.Config) jwt.JWTProvider {
	return jwt.NewJWTProvider(cfg.AuthSecret)
}

// Invoke runs a function with dependencies injected
func (c *Container) Invoke(fn interface{}) error {
	return c.Container.Invoke(fn)
}

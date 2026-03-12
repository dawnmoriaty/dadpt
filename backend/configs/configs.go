package configs

import (
	"os"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	EnvironmentDev  = "development"
	EnvironmentProd = "production"
)

type Config struct {
	// Server
	Environment string `mapstructure:"ENVIRONMENT"`
	HTTPPort    int    `mapstructure:"HTTP_PORT"`

	// Booking
	BookingExpiryDuration time.Duration `mapstructure:"BOOKING_EXPIRY_DURATION"`

	// Database
	DatabaseURI string `mapstructure:"DATABASE_URI"`

	// Redis
	RedisURI      string `mapstructure:"REDIS_URI"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	RedisDB       int    `mapstructure:"REDIS_DB"`

	// RabbitMQ
	RabbitMQURI string `mapstructure:"RABBITMQ_URI"`

	// MinIO
	MinioEndpoint  string `mapstructure:"MINIO_ENDPOINT"`
	MinioAccessKey string `mapstructure:"MINIO_ACCESS_KEY"`
	MinioSecretKey string `mapstructure:"MINIO_SECRET_KEY"`
	MinioBucket    string `mapstructure:"MINIO_BUCKET"`
	MinioBaseURL   string `mapstructure:"MINIO_BASE_URL"`
	MinioUseSSL    bool   `mapstructure:"MINIO_USE_SSL"`

	// JWT
	AuthSecret           string        `mapstructure:"AUTH_SECRET"`
	AccessTokenDuration  time.Duration `mapstructure:"ACCESS_TOKEN_DURATION"`
	RefreshTokenDuration time.Duration `mapstructure:"REFRESH_TOKEN_DURATION"`

	// AI Agent
	AIAgentGRPCAddr string `mapstructure:"AI_AGENT_GRPC_ADDR"`

	// PayOS
	PayOSClientID    string `mapstructure:"PAYOS_CLIENT_ID"`
	PayOSAPIKey      string `mapstructure:"PAYOS_API_KEY"`
	PayOSChecksumKey string `mapstructure:"PAYOS_CHECKSUM_KEY"`
	PayOSReturnURL   string `mapstructure:"PAYOS_RETURN_URL"`
	PayOSCancelURL   string `mapstructure:"PAYOS_CANCEL_URL"`
}

var cfg Config

func LoadConfig() *Config {
	viper.AutomaticEnv()

	if _, err := os.Stat(".env"); err == nil {
		viper.SetConfigFile(".env")
		viper.SetConfigType("env")
		if err := viper.ReadInConfig(); err != nil {
			log.Fatal().Err(err).Msg("Error loading config file")
		}
	}

	cfg = Config{
		Environment:          viper.GetString("ENVIRONMENT"),
		HTTPPort:             viper.GetInt("HTTP_PORT"),
		BookingExpiryDuration: viper.GetDuration("BOOKING_EXPIRY_DURATION"),
		DatabaseURI:          viper.GetString("DATABASE_URI"),
		RedisURI:             viper.GetString("REDIS_URI"),
		RedisPassword:        viper.GetString("REDIS_PASSWORD"),
		RedisDB:              viper.GetInt("REDIS_DB"),
		RabbitMQURI:          viper.GetString("RABBITMQ_URI"),
		MinioEndpoint:        viper.GetString("MINIO_ENDPOINT"),
		MinioAccessKey:       viper.GetString("MINIO_ACCESS_KEY"),
		MinioSecretKey:       viper.GetString("MINIO_SECRET_KEY"),
		MinioBucket:          viper.GetString("MINIO_BUCKET"),
		MinioBaseURL:         viper.GetString("MINIO_BASE_URL"),
		MinioUseSSL:          viper.GetBool("MINIO_USE_SSL"),
		AuthSecret:           viper.GetString("AUTH_SECRET"),
		AccessTokenDuration:  viper.GetDuration("ACCESS_TOKEN_DURATION"),
		RefreshTokenDuration: viper.GetDuration("REFRESH_TOKEN_DURATION"),
		AIAgentGRPCAddr:      viper.GetString("AI_AGENT_GRPC_ADDR"),
		PayOSClientID:        viper.GetString("PAYOS_CLIENT_ID"),
		PayOSAPIKey:          viper.GetString("PAYOS_API_KEY"),
		PayOSChecksumKey:     viper.GetString("PAYOS_CHECKSUM_KEY"),
		PayOSReturnURL:       viper.GetString("PAYOS_RETURN_URL"),
		PayOSCancelURL:       viper.GetString("PAYOS_CANCEL_URL"),
	}

	// Defaults
	if cfg.HTTPPort == 0 {
		cfg.HTTPPort = 8080
	}
	if cfg.BookingExpiryDuration == 0 {
		cfg.BookingExpiryDuration = 15 * time.Minute
	}
	if cfg.AIAgentGRPCAddr == "" {
		cfg.AIAgentGRPCAddr = "localhost:50051"
	}
	if cfg.Environment == "" {
		cfg.Environment = EnvironmentDev
	}
	if cfg.AccessTokenDuration == 0 {
		cfg.AccessTokenDuration = 15 * time.Minute
	}
	if cfg.RefreshTokenDuration == 0 {
		cfg.RefreshTokenDuration = 168 * time.Hour
	}
	if cfg.PayOSReturnURL == "" {
		cfg.PayOSReturnURL = "http://localhost:5173/payment/success"
	}
	if cfg.PayOSCancelURL == "" {
		cfg.PayOSCancelURL = "http://localhost:5173/payment/cancel"
	}

	return &cfg
}

func GetConfig() *Config {
	return &cfg
}

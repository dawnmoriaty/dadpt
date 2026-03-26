package kafka

import (
	"context"
	"fmt"
	"strings"

	"backend/pkgs/logger"

	kg "github.com/segmentio/kafka-go"
)

type TopicConfig struct {
	Name              string
	NumPartitions     int
	ReplicationFactor int
}

type Config struct {
	Enabled  bool
	Brokers  []string
	ClientID string
}

type IKafka interface {
	Close() error
	Brokers() []string
	EnsureTopics(ctx context.Context, topics []TopicConfig) error
}

type client struct {
	brokers []string
}

func NewKafka(cfg Config) (IKafka, error) {
	if !cfg.Enabled {
		return nil, nil
	}

	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("kafka brokers are required")
	}

	normalized := make([]string, 0, len(cfg.Brokers))
	for _, broker := range cfg.Brokers {
		trimmed := strings.TrimSpace(broker)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	if len(normalized) == 0 {
		return nil, fmt.Errorf("kafka brokers are empty")
	}

	logger.Info("Kafka client initialized: brokers=%s", strings.Join(normalized, ","))
	return &client{brokers: normalized}, nil
}

func ParseBrokers(raw string) []string {
	parts := strings.Split(raw, ",")
	brokers := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			brokers = append(brokers, trimmed)
		}
	}
	return brokers
}

func (c *client) Brokers() []string {
	return append([]string(nil), c.brokers...)
}

func (c *client) Close() error {
	logger.Info("Kafka client closed")
	return nil
}

func (c *client) EnsureTopics(ctx context.Context, topics []TopicConfig) error {
	if len(topics) == 0 {
		return nil
	}

	conn, err := kg.DialContext(ctx, "tcp", c.brokers[0])
	if err != nil {
		return fmt.Errorf("dial kafka broker: %w", err)
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		return fmt.Errorf("get kafka controller: %w", err)
	}

	controllerAddr := fmt.Sprintf("%s:%d", controller.Host, controller.Port)
	controllerConn, err := kg.DialContext(ctx, "tcp", controllerAddr)
	if err != nil {
		return fmt.Errorf("dial kafka controller: %w", err)
	}
	defer controllerConn.Close()

	kafkaTopics := make([]kg.TopicConfig, 0, len(topics))
	for _, topic := range topics {
		if topic.Name == "" {
			continue
		}
		partitions := topic.NumPartitions
		if partitions <= 0 {
			partitions = 6
		}
		replication := topic.ReplicationFactor
		if replication <= 0 {
			replication = 1
		}
		kafkaTopics = append(kafkaTopics, kg.TopicConfig{
			Topic:             topic.Name,
			NumPartitions:     partitions,
			ReplicationFactor: replication,
		})
	}

	if len(kafkaTopics) == 0 {
		return nil
	}

	if err := controllerConn.CreateTopics(kafkaTopics...); err != nil {
		if strings.Contains(err.Error(), "Topic with this name already exists") {
			logger.Info("Kafka topics already exist, skip create")
			return nil
		}
		return fmt.Errorf("create kafka topics: %w", err)
	}

	logger.Info("Kafka topics ensured: count=%d", len(kafkaTopics))
	return nil
}

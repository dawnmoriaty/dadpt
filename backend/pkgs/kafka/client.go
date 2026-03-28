package kafka

import (
	"context"
	"fmt"
	"strings"

	"backend/pkgs/logger"

	kg "github.com/segmentio/kafka-go"
)

// IKafka is the main Kafka client interface.
// It manages the broker connection, topic lifecycle, and provides factories
// for creating producers and consumers.
type IKafka interface {
	// Close releases all resources held by the client.
	Close() error
	// Brokers returns a copy of the broker addresses.
	Brokers() []string
	// EnsureTopics creates topics if they don't already exist.
	EnsureTopics(ctx context.Context, topics []TopicDefinition) error
	// NewProducer creates a producer for the given topic.
	NewProducer(topic string, opts ...ProducerOption) IProducer
	// NewConsumer creates a consumer for the given topic and consumer group.
	NewConsumer(topic, group string, handler MessageHandler, opts ...ConsumerOption) IConsumer
}

type client struct {
	brokers  []string
	clientID string
}

// NewKafka creates a new Kafka client. Returns (nil, nil) when Kafka is disabled.
func NewKafka(cfg Config) (IKafka, error) {
	if !cfg.Enabled {
		return nil, nil
	}

	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("kafka: brokers are required")
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
		return nil, fmt.Errorf("kafka: brokers are empty after normalization")
	}

	clientID := cfg.ClientID
	if clientID == "" {
		clientID = "kafka-client"
	}

	logger.Info("Kafka client initialized: brokers=%s, clientID=%s", strings.Join(normalized, ","), clientID)
	return &client{brokers: normalized, clientID: clientID}, nil
}

func (c *client) Brokers() []string {
	return append([]string(nil), c.brokers...)
}

func (c *client) Close() error {
	logger.Info("Kafka client closed")
	return nil
}

// EnsureTopics creates topics on the Kafka cluster if they don't exist.
// Existing topics are silently skipped.
func (c *client) EnsureTopics(ctx context.Context, topics []TopicDefinition) error {
	if len(topics) == 0 {
		return nil
	}

	conn, err := kg.DialContext(ctx, "tcp", c.brokers[0])
	if err != nil {
		return fmt.Errorf("kafka: dial broker: %w", err)
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		return fmt.Errorf("kafka: get controller: %w", err)
	}

	controllerAddr := fmt.Sprintf("%s:%d", controller.Host, controller.Port)
	controllerConn, err := kg.DialContext(ctx, "tcp", controllerAddr)
	if err != nil {
		return fmt.Errorf("kafka: dial controller: %w", err)
	}
	defer controllerConn.Close()

	kafkaTopics := make([]kg.TopicConfig, 0, len(topics))
	for _, topic := range topics {
		if !topic.Validate() {
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
		return fmt.Errorf("kafka: create topics: %w", err)
	}

	logger.Info("Kafka topics ensured: count=%d", len(kafkaTopics))
	return nil
}

// NewProducer creates a new producer for the specified topic.
func (c *client) NewProducer(topic string, opts ...ProducerOption) IProducer {
	return newProducer(c.brokers, topic, opts...)
}

// NewConsumer creates a new consumer for the specified topic and consumer group.
func (c *client) NewConsumer(topic, group string, handler MessageHandler, opts ...ConsumerOption) IConsumer {
	return newConsumer(c.brokers, topic, group, handler, opts...)
}

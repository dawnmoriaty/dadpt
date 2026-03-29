package kafka

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

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
// Retries with exponential backoff since Kafka (KRaft) may take time to elect a controller.
func (c *client) EnsureTopics(ctx context.Context, topics []TopicDefinition) error {
	if len(topics) == 0 {
		return nil
	}

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

	const maxRetries = 5
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if err := c.createTopics(ctx, kafkaTopics); err != nil {
			lastErr = err
			if attempt < maxRetries {
				backoff := time.Duration(attempt) * 2 * time.Second
				logger.Warn("Kafka topics ensure attempt %d/%d failed: %v — retrying in %v", attempt, maxRetries, err, backoff)
				select {
				case <-time.After(backoff):
				case <-ctx.Done():
					return ctx.Err()
				}
				continue
			}
		} else {
			logger.Info("Kafka topics ensured: count=%d", len(kafkaTopics))
			return nil
		}
	}

	return fmt.Errorf("kafka: ensure topics after %d retries: %w", maxRetries, lastErr)
}

// createTopics dials the broker and creates topics.
// Uses the broker address directly (instead of conn.Controller()) to avoid
// Docker-internal hostname resolution issues in single-node KRaft mode.
func (c *client) createTopics(ctx context.Context, topics []kg.TopicConfig) error {
	conn, err := kg.DialContext(ctx, "tcp", c.brokers[0])
	if err != nil {
		return fmt.Errorf("kafka: dial broker: %w", err)
	}
	defer conn.Close()

	// Get the controller info and dial it via our own resolver
	controller, err := conn.Controller()
	if err != nil {
		return fmt.Errorf("kafka: get controller: %w", err)
	}

	// In single-node KRaft mode, the controller IS the broker.
	// The controller may advertise a Docker-internal hostname (e.g. bus.kafka:29092)
	// that isn't reachable from the host. Use the original broker address instead.
	controllerAddr := fmt.Sprintf("%s:%d", controller.Host, controller.Port)
	if !c.isReachable(controllerAddr) {
		controllerAddr = c.brokers[0]
	}

	controllerConn, err := kg.DialContext(ctx, "tcp", controllerAddr)
	if err != nil {
		return fmt.Errorf("kafka: dial controller: %w", err)
	}
	defer controllerConn.Close()

	if err := controllerConn.CreateTopics(topics...); err != nil {
		if strings.Contains(err.Error(), "Topic with this name already exists") {
			logger.Info("Kafka topics already exist, skip create")
			return nil
		}
		return fmt.Errorf("kafka: create topics: %w", err)
	}

	return nil
}

// isReachable checks if a host:port is reachable with a short timeout.
func (c *client) isReachable(addr string) bool {
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// NewProducer creates a new producer for the specified topic.
func (c *client) NewProducer(topic string, opts ...ProducerOption) IProducer {
	return newProducer(c.brokers, topic, opts...)
}

// NewConsumer creates a new consumer for the specified topic and consumer group.
func (c *client) NewConsumer(topic, group string, handler MessageHandler, opts ...ConsumerOption) IConsumer {
	return newConsumer(c.brokers, topic, group, handler, opts...)
}

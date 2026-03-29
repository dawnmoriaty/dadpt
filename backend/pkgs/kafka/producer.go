package kafka

import (
	"context"
	"fmt"
	"time"

	"backend/pkgs/logger"

	kg "github.com/segmentio/kafka-go"
)

// IProducer writes messages to a Kafka topic.
type IProducer interface {
	// Publish sends a single message to Kafka.
	Publish(ctx context.Context, msg Message) error
	// PublishBatch sends multiple messages to Kafka in a single batch.
	PublishBatch(ctx context.Context, msgs []Message) error
	// Close flushes pending writes and releases resources.
	Close() error
}

// ProducerOption configures the producer.
type ProducerOption func(*producerConfig)

type producerConfig struct {
	balancer     kg.Balancer
	batchSize    int
	batchTimeout time.Duration
	async        bool
	maxAttempts  int
	writeTimeout time.Duration
	requiredAcks kg.RequiredAcks
	idempotent   bool
	compressor   kg.Compression
}

func defaultProducerConfig() producerConfig {
	return producerConfig{
		balancer:     &kg.LeastBytes{},
		batchSize:    100,
		batchTimeout: 10 * time.Millisecond,
		async:        false,
		maxAttempts:  3,
		writeTimeout: 10 * time.Second,
		requiredAcks: kg.RequireOne,
	}
}

// WithBalancer sets the partition balancer strategy.
func WithBalancer(b kg.Balancer) ProducerOption {
	return func(c *producerConfig) { c.balancer = b }
}

// WithHashBalancer uses key-based hash partitioning (messages with same key → same partition).
func WithHashBalancer() ProducerOption {
	return func(c *producerConfig) { c.balancer = &kg.Hash{} }
}

// WithBatchSize sets the maximum number of messages in a write batch.
func WithBatchSize(n int) ProducerOption {
	return func(c *producerConfig) {
		if n > 0 {
			c.batchSize = n
		}
	}
}

// WithBatchTimeout sets the max time to wait for a batch to fill before flushing.
func WithBatchTimeout(d time.Duration) ProducerOption {
	return func(c *producerConfig) {
		if d > 0 {
			c.batchTimeout = d
		}
	}
}

// WithAsync enables fire-and-forget mode. Errors are logged, not returned.
func WithAsync() ProducerOption {
	return func(c *producerConfig) { c.async = true }
}

// WithMaxAttempts sets the number of retries for failed writes.
func WithMaxAttempts(n int) ProducerOption {
	return func(c *producerConfig) {
		if n > 0 {
			c.maxAttempts = n
		}
	}
}

// WithRequireAllAcks waits for all in-sync replicas to acknowledge (strongest durability).
func WithRequireAllAcks() ProducerOption {
	return func(c *producerConfig) { c.requiredAcks = kg.RequireAll }
}

// WithCompression enables message compression (e.g. kg.Snappy, kg.Gzip, kg.Lz4, kg.Zstd).
func WithCompression(codec kg.Compression) ProducerOption {
	return func(c *producerConfig) { c.compressor = codec }
}

type producer struct {
	writer *kg.Writer
	topic  string
}

func newProducer(brokers []string, topic string, opts ...ProducerOption) IProducer {
	cfg := defaultProducerConfig()
	for _, opt := range opts {
		opt(&cfg)
	}

	w := &kg.Writer{
		Addr:         kg.TCP(brokers...),
		Topic:        topic,
		Balancer:     cfg.balancer,
		BatchSize:    cfg.batchSize,
		BatchTimeout: cfg.batchTimeout,
		Async:        cfg.async,
		MaxAttempts:  cfg.maxAttempts,
		WriteTimeout: cfg.writeTimeout,
		RequiredAcks: cfg.requiredAcks,
		Compression:  cfg.compressor,
	}

	logger.Info("Kafka producer created: topic=%s, async=%v, batchSize=%d", topic, cfg.async, cfg.batchSize)
	return &producer{writer: w, topic: topic}
}

func (p *producer) Publish(ctx context.Context, msg Message) error {
	kgMsg := toKafkaGoMessage(msg, p.topic)

	if err := p.writer.WriteMessages(ctx, kgMsg); err != nil {
		return fmt.Errorf("kafka: publish to %s: %w", p.topic, err)
	}
	return nil
}

func (p *producer) PublishBatch(ctx context.Context, msgs []Message) error {
	if len(msgs) == 0 {
		return nil
	}

	kgMsgs := make([]kg.Message, 0, len(msgs))
	for _, msg := range msgs {
		kgMsgs = append(kgMsgs, toKafkaGoMessage(msg, p.topic))
	}

	if err := p.writer.WriteMessages(ctx, kgMsgs...); err != nil {
		return fmt.Errorf("kafka: publish batch to %s (count=%d): %w", p.topic, len(msgs), err)
	}
	return nil
}

func (p *producer) Close() error {
	if err := p.writer.Close(); err != nil {
		return fmt.Errorf("kafka: close producer %s: %w", p.topic, err)
	}
	logger.Info("Kafka producer closed: topic=%s", p.topic)
	return nil
}

// toKafkaGoMessage converts our Message to kafka-go's Message format.
func toKafkaGoMessage(msg Message, defaultTopic string) kg.Message {
	kgMsg := kg.Message{
		Key:   msg.Key,
		Value: msg.Value,
	}

	// kafka-go forbids specifying topic on both Writer and Message.
	// Our producers are created per-topic, so only propagate Message.Topic
	// when the writer itself has no default topic configured.
	if defaultTopic == "" && msg.Topic != "" {
		kgMsg.Topic = msg.Topic
	}

	if len(msg.Headers) > 0 {
		headers := make([]kg.Header, 0, len(msg.Headers))
		for k, v := range msg.Headers {
			headers = append(headers, kg.Header{
				Key:   k,
				Value: []byte(v),
			})
		}
		kgMsg.Headers = headers
	}

	return kgMsg
}

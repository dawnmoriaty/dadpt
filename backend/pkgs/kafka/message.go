package kafka

import (
	"encoding/json"
	"fmt"
	"time"
)

// Message is the standard message envelope for Kafka produce/consume.
type Message struct {
	// Key is the partition key (optional). Messages with the same key go to the same partition.
	Key []byte
	// Value is the message payload.
	Value []byte
	// Headers holds optional metadata (e.g. eventType, correlationId, source).
	Headers map[string]string
	// Topic overrides the producer's default topic if set.
	Topic string
	// Timestamp is set by the broker on produce; populated on consume.
	Timestamp time.Time
	// Partition and Offset are populated on consume.
	Partition int
	Offset    int64
}

// NewJSONMessage creates a Message with a JSON-encoded value and optional headers.
// key is used for partitioning (e.g. aggregate ID).
func NewJSONMessage(key string, value interface{}, headers map[string]string) (Message, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return Message{}, fmt.Errorf("kafka: marshal message value: %w", err)
	}

	msg := Message{
		Value:   data,
		Headers: headers,
	}
	if key != "" {
		msg.Key = []byte(key)
	}
	return msg, nil
}

// NewRawMessage creates a Message with raw bytes and optional headers.
func NewRawMessage(key string, value []byte, headers map[string]string) Message {
	msg := Message{
		Value:   value,
		Headers: headers,
	}
	if key != "" {
		msg.Key = []byte(key)
	}
	return msg
}

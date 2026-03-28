package kafka

import "strings"

// Config holds Kafka client connection settings (from environment).
// This is connection-level only — topic definitions live in the Registry.
type Config struct {
	Enabled  bool
	Brokers  []string
	ClientID string
}

// TopicDefinition describes a Kafka topic for the registry.
type TopicDefinition struct {
	Name              string
	NumPartitions     int
	ReplicationFactor int
	ConsumerGroup     string // default consumer group for consumers of this topic
}

// Validate returns true if the definition has at least a non-empty name.
func (td TopicDefinition) Validate() bool {
	return strings.TrimSpace(td.Name) != ""
}

// ParseBrokers splits a comma-separated broker string into a trimmed slice.
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

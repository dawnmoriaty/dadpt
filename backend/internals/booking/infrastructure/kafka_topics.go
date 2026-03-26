package infrastructure

import (
	"backend/configs"
	"backend/pkgs/kafka"
)

const (
	DefaultKafkaPartitions  = 12
	DefaultKafkaReplication = 1
)

func BookingKafkaTopics(cfg *configs.Config) []kafka.TopicConfig {
	if cfg == nil {
		return nil
	}

	return []kafka.TopicConfig{
		{
			Name:              cfg.KafkaBookingEventsTopic,
			NumPartitions:     DefaultKafkaPartitions,
			ReplicationFactor: DefaultKafkaReplication,
		},
		{
			Name:              cfg.KafkaRefundEventsTopic,
			NumPartitions:     DefaultKafkaPartitions,
			ReplicationFactor: DefaultKafkaReplication,
		},
	}
}

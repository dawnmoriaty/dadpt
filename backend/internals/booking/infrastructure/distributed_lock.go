package infrastructure

import (
	"context"
	"time"

	"backend/internals/booking/domain"
	"backend/pkgs/redis"
)

type redisDistributedLock struct {
	client redis.IRedis
}

// NewDistributedLock creates a new Redis-based distributed lock
func NewDistributedLock(client redis.IRedis) domain.DistributedLock {
	return &redisDistributedLock{client: client}
}

func (r *redisDistributedLock) Acquire(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	if r.client == nil || !r.client.IsConnected() {
		// If Redis not available, allow operation to proceed (degraded mode)
		return true, nil
	}
	return r.client.SetNX(key, "locked", ttl)
}

func (r *redisDistributedLock) Release(ctx context.Context, key string) error {
	if r.client == nil || !r.client.IsConnected() {
		return nil
	}
	return r.client.Remove(key)
}

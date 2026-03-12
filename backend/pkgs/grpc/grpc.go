package grpc

import (
	"context"
	"fmt"
	"time"

	"backend/pkgs/logger"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const DefaultDialTimeout = 5 * time.Second

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Config holds settings for a gRPC client connection.
type Config struct {
	Target   string // e.g. "localhost:50051"
	Insecure bool   // true → no TLS (dev mode)
}

// ─────────────────────────────────────────────────────────────────────────────
// Conn — wraps *grpc.ClientConn
// ─────────────────────────────────────────────────────────────────────────────

// Conn wraps a gRPC client connection with convenience helpers.
type Conn struct {
	cc     *grpc.ClientConn
	target string
}

// Dial creates a new gRPC connection using the provided config.
func Dial(cfg Config) (*Conn, error) {
	if cfg.Target == "" {
		return nil, fmt.Errorf("grpc: target address is empty")
	}

	registerRawCodec()
	opts := []grpc.DialOption{grpc.WithDefaultCallOptions(grpc.ForceCodec(rawCodec{}))}
	if cfg.Insecure {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	conn, err := grpc.NewClient(cfg.Target, opts...)
	if err != nil {
		return nil, fmt.Errorf("grpc: failed to dial %s: %w", cfg.Target, err)
	}

	logger.Info("gRPC connection established: %s", cfg.Target)
	return &Conn{cc: conn, target: cfg.Target}, nil
}

// Invoke calls a gRPC method on the underlying connection.
func (c *Conn) Invoke(ctx context.Context, method string, req, reply interface{}, opts ...grpc.CallOption) error {
	return c.cc.Invoke(ctx, method, req, reply, opts...)
}

// Target returns the connection target address.
func (c *Conn) Target() string {
	return c.target
}

// Close closes the underlying gRPC connection.
func (c *Conn) Close() error {
	if c.cc != nil {
		return c.cc.Close()
	}
	return nil
}

// ClientConn returns the raw *grpc.ClientConn for advanced usage.
func (c *Conn) ClientConn() *grpc.ClientConn {
	return c.cc
}

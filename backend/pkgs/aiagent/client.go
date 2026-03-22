package aiagent

import (
	"context"
	"encoding/json"
	"fmt"

	grpcpkg "backend/pkgs/grpc"
)

// ─────────────────────────────────────────────────────────────────────────────
// DTOs — shared request / response types
// ─────────────────────────────────────────────────────────────────────────────

// ChatRequest represents a request to the AI agent.
type ChatRequest struct {
	TenantSlug string `json:"tenant_slug"`
	SessionID  string `json:"session_id"`
	Message    string `json:"message"`
	UserID     string `json:"user_id,omitempty"`
}

// ChatResponse represents the AI agent's response.
type ChatResponse struct {
	Message      string     `json:"message"`
	Status       string     `json:"status"` // completed | paused | error
	SessionID    string     `json:"session_id"`
	WorkflowSlug string     `json:"workflow_slug,omitempty"`
	ToolCalls    []ToolCall `json:"tool_calls,omitempty"`
}

// ToolCall represents a tool invocation log entry.
type ToolCall struct {
	ToolName  string `json:"tool_name"`
	Inputs    string `json:"inputs"`
	Output    string `json:"output"`
	Timestamp string `json:"timestamp"`
}

// SyncDataRequest represents a data sync request to the AI service.
type SyncDataRequest struct {
	TenantSlug string `json:"tenant_slug"`
	Collection string `json:"collection"` // "trips", "locations", "faq"
	DataJSON   string `json:"data_json"`  // JSON array string
}

// SyncDataResponse represents the AI service's sync response.
type SyncDataResponse struct {
	UpsertedCount int32  `json:"upserted_count"`
	Message       string `json:"message"`
}

// VoiceTranscribeRequest represents audio data for transcription over gRPC.
type VoiceTranscribeRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	AudioBase64 string `json:"audio_base64"`
}

// VoiceTranscribeResponse represents STT output from AI service.
type VoiceTranscribeResponse struct {
	Transcript string `json:"transcript"`
	Engine     string `json:"engine"`
}

type VoiceParseRequest struct {
	Transcript string `json:"transcript"`
}

type VoiceParseCommand struct {
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travel_date"`
	SeatCount           int      `json:"seat_count"`
	SeatPreferenceOrder []string `json:"seat_preference_order"`
}

type VoiceParseResponse struct {
	Command       *VoiceParseCommand `json:"command"`
	Confidence    float64            `json:"confidence"`
	MissingFields []string           `json:"missing_fields"`
	Message       string             `json:"message"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Port — interface for communicating with the AI agent service
// ─────────────────────────────────────────────────────────────────────────────

// Client defines the port for communicating with the AI agent service.
// Any transport (gRPC, HTTP, mock) can implement this interface.
type Client interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	SyncData(ctx context.Context, req *SyncDataRequest) (*SyncDataResponse, error)
	TranscribeAudio(ctx context.Context, req *VoiceTranscribeRequest) (*VoiceTranscribeResponse, error)
	ParseVoiceCommand(ctx context.Context, req *VoiceParseRequest) (*VoiceParseResponse, error)
	Close() error
}

// ─────────────────────────────────────────────────────────────────────────────
// gRPC adapter — uses pkgs/grpc.Conn
// ─────────────────────────────────────────────────────────────────────────────

// GRPCClient implements Client via the shared pkgs/grpc connection.
type GRPCClient struct {
	conn *grpcpkg.Conn
}

// NewGRPCClient creates an AI agent client using a shared gRPC connection.
func NewGRPCClient(conn *grpcpkg.Conn) *GRPCClient {
	return &GRPCClient{conn: conn}
}

// Chat sends a chat request to the AI agent via gRPC.
func (c *GRPCClient) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal chat request: %w", err)
	}

	var respBytes []byte
	err = c.conn.Invoke(ctx, "/aiagent.AIAgentService/Chat", reqBytes, &respBytes)
	if err != nil {
		return nil, fmt.Errorf("AI agent Chat RPC failed: %w", err)
	}

	var resp ChatResponse
	if err := json.Unmarshal(respBytes, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal chat response: %w", err)
	}

	return &resp, nil
}

// SyncData pushes data to the AI agent for vectorization via gRPC.
func (c *GRPCClient) SyncData(ctx context.Context, req *SyncDataRequest) (*SyncDataResponse, error) {
	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal sync request: %w", err)
	}

	var respBytes []byte
	err = c.conn.Invoke(ctx, "/aiagent.AIAgentService/SyncData", reqBytes, &respBytes)
	if err != nil {
		return nil, fmt.Errorf("AI agent SyncData RPC failed: %w", err)
	}

	var resp SyncDataResponse
	if err := json.Unmarshal(respBytes, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal sync response: %w", err)
	}

	return &resp, nil
}

// TranscribeAudio sends voice bytes to AI service VoiceBookingService over gRPC.
func (c *GRPCClient) TranscribeAudio(ctx context.Context, req *VoiceTranscribeRequest) (*VoiceTranscribeResponse, error) {
	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal transcribe request: %w", err)
	}

	var respBytes []byte
	err = c.conn.Invoke(ctx, "/aiagent.VoiceBookingService/TranscribeAudio", reqBytes, &respBytes)
	if err != nil {
		return nil, fmt.Errorf("voice transcribe RPC failed: %w", err)
	}

	var resp VoiceTranscribeResponse
	if err := json.Unmarshal(respBytes, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transcribe response: %w", err)
	}

	return &resp, nil
}

func (c *GRPCClient) ParseVoiceCommand(ctx context.Context, req *VoiceParseRequest) (*VoiceParseResponse, error) {
	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal parse voice request: %w", err)
	}

	var respBytes []byte
	err = c.conn.Invoke(ctx, "/aiagent.VoiceBookingService/ParseCommand", reqBytes, &respBytes)
	if err != nil {
		return nil, fmt.Errorf("voice parse RPC failed: %w", err)
	}

	var resp VoiceParseResponse
	if err := json.Unmarshal(respBytes, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal parse voice response: %w", err)
	}

	return &resp, nil
}

// Close is a no-op — connection lifecycle is managed by pkgs/grpc.Conn.
func (c *GRPCClient) Close() error {
	return nil
}

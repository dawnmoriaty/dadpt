package aiagent

import (
	"context"
	"encoding/json"
	"fmt"

	grpcpkg "backend/pkgs/grpc"
)


type ChatRequest struct {
	TenantSlug string `json:"tenant_slug"`
	SessionID  string `json:"session_id"`
	Message    string `json:"message"`
	UserID     string `json:"user_id,omitempty"`
}

type ChatResponse struct {
	Message      string           `json:"message"`
	Status       string           `json:"status"` // completed | paused | error
	SessionID    string           `json:"session_id"`
	WorkflowSlug string           `json:"workflow_slug,omitempty"`
	ToolCalls    []ToolCall       `json:"tool_calls,omitempty"`
	UiActions    []map[string]any `json:"ui_actions,omitempty"`
	TraceID      string           `json:"trace_id,omitempty"`
	Metrics      map[string]any   `json:"metrics,omitempty"`
}

type ToolCall struct {
	ToolName  string `json:"tool_name"`
	Inputs    string `json:"inputs"`
	Output    string `json:"output"`
	Timestamp string `json:"timestamp"`
}

type SyncDataRequest struct {
	TenantSlug string `json:"tenant_slug"`
	Collection string `json:"collection"` // "trips", "locations", "faq"
	DataJSON   string `json:"data_json"`  // JSON array string
}

type SyncDataResponse struct {
	UpsertedCount int32  `json:"upserted_count"`
	Message       string `json:"message"`
}

type VoiceTranscribeRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	AudioBase64 string `json:"audio_base64"`
}

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


type Client interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	SyncData(ctx context.Context, req *SyncDataRequest) (*SyncDataResponse, error)
	TranscribeAudio(ctx context.Context, req *VoiceTranscribeRequest) (*VoiceTranscribeResponse, error)
	ParseVoiceCommand(ctx context.Context, req *VoiceParseRequest) (*VoiceParseResponse, error)
	Close() error
}


type GRPCClient struct {
	conn *grpcpkg.Conn
}

func NewGRPCClient(conn *grpcpkg.Conn) *GRPCClient {
	return &GRPCClient{conn: conn}
}

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

func (c *GRPCClient) Close() error {
	return nil
}

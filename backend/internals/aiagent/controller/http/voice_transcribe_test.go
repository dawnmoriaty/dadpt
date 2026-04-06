package http

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeAIClient struct {
	req       *aiagent.VoiceTranscribeRequest
	resp      *aiagent.VoiceTranscribeResponse
	err       error
	parseResp *aiagent.VoiceParseResponse
	parseErr  error
}

func (f *fakeAIClient) Chat(ctx context.Context, req *aiagent.ChatRequest) (*aiagent.ChatResponse, error) {
	return nil, nil
}

func (f *fakeAIClient) SyncData(ctx context.Context, req *aiagent.SyncDataRequest) (*aiagent.SyncDataResponse, error) {
	return nil, nil
}

func (f *fakeAIClient) TranscribeAudio(ctx context.Context, req *aiagent.VoiceTranscribeRequest) (*aiagent.VoiceTranscribeResponse, error) {
	f.req = req
	if f.err != nil {
		return nil, f.err
	}
	return f.resp, nil
}

func (f *fakeAIClient) ParseVoiceCommand(ctx context.Context, req *aiagent.VoiceParseRequest) (*aiagent.VoiceParseResponse, error) {
	if f.parseErr != nil {
		return nil, f.parseErr
	}
	return f.parseResp, nil
}

func (f *fakeAIClient) Close() error {
	return nil
}

func TestVoiceTranscribe_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := &fakeAIClient{
		resp: &aiagent.VoiceTranscribeResponse{Transcript: "xin chao", Engine: "faster-whisper"},
	}
	h := NewChatHandler(client, nil, nil, nil, nil)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "test.webm")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write([]byte("audio-bytes")); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/ai/voice/booking/transcribe", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req

	h.VoiceTranscribe(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}

	if client.req == nil {
		t.Fatalf("expected grpc transcribe request")
	}

	decoded, err := base64.StdEncoding.DecodeString(client.req.AudioBase64)
	if err != nil {
		t.Fatalf("invalid base64 payload: %v", err)
	}
	if string(decoded) != "audio-bytes" {
		t.Fatalf("unexpected audio payload: %q", string(decoded))
	}

	var payload struct {
		Data aiagent.VoiceTranscribeResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Data.Transcript != "xin chao" {
		t.Fatalf("unexpected transcript: %s", payload.Data.Transcript)
	}
}

func TestMapVoiceTranscribeError(t *testing.T) {
	invalidArgErr := status.Error(codes.InvalidArgument, "invalid audio")
	mappedInvalid := mapVoiceTranscribeError(invalidArgErr)
	if appErr, ok := mappedInvalid.(*pkgErrors.AppError); !ok || appErr.Code != pkgErrors.ErrCodeVoiceAudioInvalid {
		t.Fatalf("expected VOICE_AUDIO_INVALID, got %#v", mappedInvalid)
	}

	unimplementedErr := status.Error(codes.Unimplemented, "stt unavailable")
	mappedUnavailable := mapVoiceTranscribeError(unimplementedErr)
	if appErr, ok := mappedUnavailable.(*pkgErrors.AppError); !ok || appErr.Code != pkgErrors.ErrCodeVoiceTranscribeUnavailable {
		t.Fatalf("expected VOICE_TRANSCRIBE_UNAVAILABLE, got %#v", mappedUnavailable)
	}
}

func TestVoicePipeline_ParseOnlyWithoutCommand(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := &fakeAIClient{
		resp: &aiagent.VoiceTranscribeResponse{Transcript: "toi muon di da lat", Engine: "faster-whisper"},
		parseResp: &aiagent.VoiceParseResponse{
			Command:       nil,
			Confidence:    0.42,
			MissingFields: []string{"destination", "travel_date"},
			Message:       "missing fields",
		},
	}
	h := NewChatHandler(client, nil, nil, nil, nil)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "voice.webm")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write([]byte("audio-bytes")); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/ai/voice/booking/pipeline", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req

	h.VoicePipeline(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}

	var payload struct {
		Data struct {
			Transcript string                 `json:"transcript"`
			Parse      map[string]interface{} `json:"parse"`
			Plan       interface{}            `json:"plan"`
			Execute    interface{}            `json:"execute"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Data.Transcript == "" {
		t.Fatalf("expected transcript in pipeline response")
	}
	if payload.Data.Parse == nil {
		t.Fatalf("expected parse in pipeline response")
	}
	if payload.Data.Plan != nil {
		t.Fatalf("expected no plan when parse has no command")
	}
}

func TestVoicePipeline_CommandButNoVoiceHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := &fakeAIClient{
		resp: &aiagent.VoiceTranscribeResponse{Transcript: "di da lat ngay mai", Engine: "faster-whisper"},
		parseResp: &aiagent.VoiceParseResponse{
			Command: &aiagent.VoiceParseCommand{
				Origin:              "Ben xe Mien Dong",
				Destination:         "Ben xe Da Lat",
				TravelDate:          "2026-03-30",
				SeatCount:           1,
				SeatPreferenceOrder: []string{"A1"},
			},
			Confidence: 0.88,
			Message:    "ok",
		},
	}
	h := NewChatHandler(client, nil, nil, nil, nil)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "voice.webm")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write([]byte("audio-bytes")); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/ai/voice/booking/pipeline", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req
	c.Set("userID", int(99))

	h.VoicePipeline(c)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d body=%s", rec.Code, rec.Body.String())
	}
}

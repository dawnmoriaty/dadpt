package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	authDomain "backend/internals/auth/domain"
	bookingHttp "backend/internals/booking/controller/http"
	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/logger"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

// ChatHandler handles AI agent chat HTTP requests.
type ChatHandler struct {
	client       aiagent.Client
	userRepo     authDomain.Repository
	voiceHandler *bookingHttp.VoiceBookingHandler
}

// NewChatHandler creates a new ChatHandler.
func NewChatHandler(client aiagent.Client, userRepo authDomain.Repository, voiceHandler *bookingHttp.VoiceBookingHandler) *ChatHandler {
	return &ChatHandler{client: client, userRepo: userRepo, voiceHandler: voiceHandler}
}

// ChatRequest is the HTTP request body for /chat.
type ChatRequest struct {
	TenantSlug string `json:"tenant_slug" binding:"required"`
	SessionID  string `json:"session_id"`
	Message    string `json:"message" binding:"required"`
	UserID     string `json:"user_id"`
}

type VoicePipelineResponse struct {
	Transcript string      `json:"transcript"`
	Parse      interface{} `json:"parse"`
	Plan       interface{} `json:"plan,omitempty"`
	Execute    interface{} `json:"execute,omitempty"`
}

func (h *ChatHandler) callInternalJSON(c *gin.Context, method, path string, payload any) (map[string]any, error) {
	if h.voiceHandler == nil {
		return nil, pkgErrors.Wrap(nil, 500, pkgErrors.ErrCodeInternal)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), method, path, bytes.NewReader(body))
	if err != nil {
		return nil, pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = req
	userID, ok := c.Get("userID")
	if !ok {
		return nil, pkgErrors.ErrUnauthorized
	}
	ctx.Set("userID", userID)

	switch path {
	case "/api/v1/bookings/voice/plan":
		h.voiceHandler.Plan(ctx)
	case "/api/v1/bookings/voice/execute":
		h.voiceHandler.Execute(ctx)
	default:
		return nil, pkgErrors.ErrBadRequest
	}

	if recorder.Code >= 400 {
		var errPayload struct {
			Status string `json:"status"`
		}
		_ = json.Unmarshal(recorder.Body.Bytes(), &errPayload)
		if errPayload.Status != "" {
			return nil, pkgErrors.NewAppError(recorder.Code, errPayload.Status)
		}
		return nil, pkgErrors.Wrap(nil, recorder.Code, pkgErrors.ErrCodeInternal)
	}

	var result map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
		return nil, pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}

	if data, ok := result["data"].(map[string]any); ok {
		return data, nil
	}

	return result, nil
}

// Chat handles POST /api/v1/ai/chat — forwards to AI agent via gRPC.
func (h *ChatHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "BAD_REQUEST")
		return
	}

	if h.client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code":    http.StatusServiceUnavailable,
			"status":  "error",
			"message": "AI agent service not available",
		})
		return
	}

	resp, err := h.client.Chat(c.Request.Context(), &aiagent.ChatRequest{
		TenantSlug: req.TenantSlug,
		SessionID:  req.SessionID,
		Message:    req.Message,
		UserID:     req.UserID,
	})
	if err != nil {
		logger.Error("AI Agent chat failed: %v", err)
		response.InternalServerError(c)
		return
	}

	response.Success(c, resp)
}

// SyncDataRequest is the HTTP request body for /sync.
type SyncDataRequest struct {
	TenantSlug string `json:"tenant_slug" binding:"required"`
	Collection string `json:"collection" binding:"required"`
	DataJSON   string `json:"data_json" binding:"required"`
}

// SyncData handles POST /api/v1/ai/sync — pushes data to AI agent for vectorization.
func (h *ChatHandler) SyncData(c *gin.Context) {
	var req SyncDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "BAD_REQUEST")
		return
	}

	if h.client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code":    http.StatusServiceUnavailable,
			"status":  "error",
			"message": "AI agent service not available",
		})
		return
	}

	resp, err := h.client.SyncData(c.Request.Context(), &aiagent.SyncDataRequest{
		TenantSlug: req.TenantSlug,
		Collection: req.Collection,
		DataJSON:   req.DataJSON,
	})
	if err != nil {
		logger.Error("AI Agent sync failed: %v", err)
		response.InternalServerError(c)
		return
	}

	response.Success(c, resp)
}

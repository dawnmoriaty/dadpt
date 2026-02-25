package http

import (
	"net/http"

	"backend/pkgs/aiagent"
	"backend/pkgs/logger"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

// ChatHandler handles AI agent chat HTTP requests.
type ChatHandler struct {
	client aiagent.Client
}

// NewChatHandler creates a new ChatHandler.
func NewChatHandler(client aiagent.Client) *ChatHandler {
	return &ChatHandler{client: client}
}

// ChatRequest is the HTTP request body for /chat.
type ChatRequest struct {
	TenantSlug string `json:"tenant_slug" binding:"required"`
	SessionID  string `json:"session_id"`
	Message    string `json:"message" binding:"required"`
	UserID     string `json:"user_id"`
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

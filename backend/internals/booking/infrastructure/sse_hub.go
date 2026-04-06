package infrastructure

import (
	"fmt"
	"sync"

	"backend/pkgs/logger"
)

type SSEHub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[chan []byte]struct{}),
	}
}

func (h *SSEHub) Register(ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[ch] = struct{}{}
	logger.Info("SSE client registered (total=%d)", len(h.clients))
}

func (h *SSEHub) Unregister(ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[ch]; ok {
		delete(h.clients, ch)
		close(ch)
		logger.Info("SSE client unregistered (total=%d)", len(h.clients))
	}
}

func (h *SSEHub) Broadcast(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if len(h.clients) == 0 {
		return
	}

	for ch := range h.clients {
		select {
		case ch <- data:
		default:
			logger.Warn("SSE client buffer full, dropping message")
		}
	}

	logger.Info("SSE broadcast sent to %d clients", len(h.clients))
}

func (h *SSEHub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func FormatSSEEvent(eventType string, data []byte) string {
	return fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(data))
}

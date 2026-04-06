package http

import (
	"encoding/base64"
	"fmt"
	"io"
	"strings"

	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const maxVoiceUploadSize = 15 * 1024 * 1024

func (h *ChatHandler) VoiceTranscribe(c *gin.Context) {
	if h.client == nil {
		response.HandleError(c, pkgErrors.Wrap(fmt.Errorf("ai client unavailable"), 503, pkgErrors.ErrCodeInternal))
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeRequiredField))
		return
	}

	if fileHeader.Size <= 0 || fileHeader.Size > maxVoiceUploadSize {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeInvalidFile))
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		response.HandleError(c, pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeInvalidFile))
		return
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		response.HandleError(c, pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeInvalidFile))
		return
	}

	if len(bytes) == 0 {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeInvalidFile))
		return
	}

	contentType := strings.TrimSpace(fileHeader.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "audio/webm"
	}

	resp, err := h.client.TranscribeAudio(c.Request.Context(), &aiagent.VoiceTranscribeRequest{
		Filename:    fileHeader.Filename,
		ContentType: contentType,
		AudioBase64: base64.StdEncoding.EncodeToString(bytes),
	})
	if err != nil {
		response.HandleError(c, mapVoiceTranscribeError(err))
		return
	}

	response.Success(c, resp)
}

func mapVoiceTranscribeError(err error) error {
	st, ok := status.FromError(err)
	if !ok {
		return pkgErrors.Wrap(err, 502, pkgErrors.ErrCodeInternal)
	}

	switch st.Code() {
	case codes.Unimplemented:
		return pkgErrors.ErrVoiceTranscribeUnavailable
	case codes.InvalidArgument:
		return pkgErrors.ErrVoiceAudioInvalid
	default:
		return pkgErrors.Wrap(err, 502, pkgErrors.ErrCodeInternal)
	}
}

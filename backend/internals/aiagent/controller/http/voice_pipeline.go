package http

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"

	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type voicePlanRequest struct {
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travelDate"`
	SeatCount           int      `json:"seatCount"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
}

type voiceExecuteRequest struct {
	TripID              *int64   `json:"tripId,omitempty"`
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travelDate"`
	SeatCount           int      `json:"seatCount"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
	PaymentMethod       string   `json:"paymentMethod"`
}

type voicePipelineRequest struct {
	Execute bool   `form:"execute"`
	Payment string `form:"paymentMethod"`
}

// VoicePipeline handles full flow: transcribe -> parse (gRPC) -> plan/execute (Go backend logic).
func (h *ChatHandler) VoicePipeline(c *gin.Context) {
	if h.client == nil {
		response.HandleError(c, pkgErrors.Wrap(fmt.Errorf("ai client unavailable"), 503, pkgErrors.ErrCodeInternal))
		return
	}

	var req voicePipelineRequest
	_ = c.ShouldBind(&req)

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

	transcribed, err := h.client.TranscribeAudio(c.Request.Context(), &aiagent.VoiceTranscribeRequest{
		Filename:    fileHeader.Filename,
		ContentType: contentType,
		AudioBase64: base64.StdEncoding.EncodeToString(bytes),
	})
	if err != nil {
		response.HandleError(c, mapVoiceTranscribeError(err))
		return
	}

	parsed, err := h.client.ParseVoiceCommand(c.Request.Context(), &aiagent.VoiceParseRequest{Transcript: transcribed.Transcript})
	if err != nil {
		response.HandleError(c, pkgErrors.Wrap(err, 502, pkgErrors.ErrCodeInternal))
		return
	}

	if parsed.Command == nil {
		response.Success(c, VoicePipelineResponse{
			Transcript: transcribed.Transcript,
			Parse:      parsed,
		})
		return
	}

	planPayload := voicePlanRequest{
		Origin:              strings.TrimSpace(parsed.Command.Origin),
		Destination:         strings.TrimSpace(parsed.Command.Destination),
		TravelDate:          strings.TrimSpace(parsed.Command.TravelDate),
		SeatCount:           parsed.Command.SeatCount,
		SeatPreferenceOrder: parsed.Command.SeatPreferenceOrder,
	}

	if planPayload.SeatCount <= 0 {
		planPayload.SeatCount = 1
	}
	if planPayload.TravelDate == "" {
		planPayload.TravelDate = "auto"
	}

	planResp, planErr := h.callInternalJSON(c, http.MethodPost, "/api/v1/bookings/voice/plan", planPayload)
	if planErr != nil {
		response.HandleError(c, planErr)
		return
	}

	pipelineResp := VoicePipelineResponse{
		Transcript: transcribed.Transcript,
		Parse:      parsed,
		Plan:       planResp,
	}

	if req.Execute {
		paymentMethod := strings.TrimSpace(req.Payment)
		if paymentMethod == "" {
			paymentMethod = "cod"
		}

		execPayload := voiceExecuteRequest{
			Origin:              planPayload.Origin,
			Destination:         planPayload.Destination,
			TravelDate:          planPayload.TravelDate,
			SeatCount:           planPayload.SeatCount,
			SeatPreferenceOrder: planPayload.SeatPreferenceOrder,
			PaymentMethod:       paymentMethod,
		}

		execResp, execErr := h.callInternalJSON(c, http.MethodPost, "/api/v1/bookings/voice/execute", execPayload)
		if execErr != nil {
			response.HandleError(c, execErr)
			return
		}
		pipelineResp.Execute = execResp
	}

	response.Success(c, pipelineResp)
}

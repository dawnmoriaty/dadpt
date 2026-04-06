package http

import (
	"encoding/base64"
	"fmt"
	"io"
	"strings"

	bookingDto "backend/internals/booking/controller/dto"
	bookingHttp "backend/internals/booking/controller/http"
	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type voicePipelineRequest struct {
	Execute bool `form:"execute"`
}

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

	audioBytes, err := io.ReadAll(file)
	if err != nil {
		response.HandleError(c, pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeInvalidFile))
		return
	}
	if len(audioBytes) == 0 {
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
		AudioBase64: base64.StdEncoding.EncodeToString(audioBytes),
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

	userID, err := bookingHttp.ExtractUserID(c)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	seatCount := parsed.Command.SeatCount
	if seatCount <= 0 {
		seatCount = 1
	}
	travelDate := strings.TrimSpace(parsed.Command.TravelDate)
	if travelDate == "" {
		travelDate = "auto"
	}

	planReq := &bookingDto.VoicePlanRequest{
		Origin:              strings.TrimSpace(parsed.Command.Origin),
		Destination:         strings.TrimSpace(parsed.Command.Destination),
		TravelDate:          travelDate,
		SeatCount:           seatCount,
		SeatPreferenceOrder: parsed.Command.SeatPreferenceOrder,
	}

	planResp, planErr := h.callPlanDirect(c.Request.Context(), userID, planReq)
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
		execReq := &bookingDto.VoiceExecuteRequest{
			Origin:              planReq.Origin,
			Destination:         planReq.Destination,
			TravelDate:          planReq.TravelDate,
			SeatCount:           planReq.SeatCount,
			SeatPreferenceOrder: planReq.SeatPreferenceOrder,
		}

		execResp, execErr := h.callExecuteDirect(c.Request.Context(), userID, execReq)
		if execErr != nil {
			response.HandleError(c, execErr)
			return
		}
		pipelineResp.Execute = execResp
	}

	response.Success(c, pipelineResp)
}

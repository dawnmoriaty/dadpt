package http

import (
	"strings"
	"time"

	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

const (
	voiceReasonAccepted               = "VOICE_BOOKING_ACCEPTED"
	voiceReasonAuthRequired           = "VOICE_BOOKING_AUTH_REQUIRED"
	voiceReasonInvalidPayload         = "VOICE_BOOKING_INVALID_PAYLOAD"
	voiceReasonProfileFieldsForbidden = "VOICE_BOOKING_PROFILE_FIELDS_FORBIDDEN"
	voiceReasonInvalidTravelDate      = "VOICE_BOOKING_INVALID_TRAVEL_DATE"
	voiceReasonInvalidRoute           = "VOICE_BOOKING_INVALID_ROUTE"
	voiceReasonUserNotFound           = "VOICE_BOOKING_USER_NOT_FOUND"
	voiceReasonUserInactive           = "VOICE_BOOKING_USER_INACTIVE"
	voiceReasonProfileIncomplete      = "VOICE_BOOKING_PROFILE_INCOMPLETE"
)

type VoiceBookingCommandRequest struct {
	Origin              string   `json:"origin" binding:"required"`
	Destination         string   `json:"destination" binding:"required"`
	TravelDate          string   `json:"travelDate" binding:"required"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`

	// Explicitly disallow profile fields from AI command.
	GuestInfo  map[string]any `json:"guestInfo"`
	GuestName  *string        `json:"guestName"`
	GuestPhone *string        `json:"guestPhone"`
	GuestEmail *string        `json:"guestEmail"`
}

type VoiceBookingNormalizedCommand struct {
	UserID              int64    `json:"userId"`
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travelDate"`
	SeatCount           int      `json:"seatCount"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder,omitempty"`
}

type VoiceBookingValidationResponse struct {
	Accepted      bool                           `json:"accepted"`
	ReasonCode    string                         `json:"reasonCode"`
	Reason        string                         `json:"reason"`
	Normalized    *VoiceBookingNormalizedCommand `json:"normalizedCommand,omitempty"`
	ProfileSource string                         `json:"profileSource,omitempty"`
	MaskedPhone   string                         `json:"maskedPhone,omitempty"`
	MaskedEmail   string                         `json:"maskedEmail,omitempty"`
}

// ValidateVoiceBookingCommand validates AI-generated booking command.
// This endpoint requires authenticated user context and rejects profile fields in payload.
func (h *ChatHandler) ValidateVoiceBookingCommand(c *gin.Context) {
	var req VoiceBookingCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Success(c, rejectVoice(voiceReasonInvalidPayload, "Invalid voice booking payload"))
		return
	}

	userIDValue, exists := c.Get("userID")
	if !exists {
		response.Success(c, rejectVoice(voiceReasonAuthRequired, "Authentication is required"))
		return
	}

	if req.GuestInfo != nil || req.GuestName != nil || req.GuestPhone != nil || req.GuestEmail != nil {
		response.Success(c, rejectVoice(voiceReasonProfileFieldsForbidden, "Profile fields are not allowed in voice command"))
		return
	}

	origin := strings.TrimSpace(req.Origin)
	destination := strings.TrimSpace(req.Destination)
	travelDate := strings.TrimSpace(req.TravelDate)

	if origin == "" || destination == "" || strings.EqualFold(origin, destination) {
		response.Success(c, rejectVoice(voiceReasonInvalidRoute, "Origin and destination must be different"))
		return
	}

	if _, err := time.Parse("2006-01-02", travelDate); err != nil {
		response.Success(c, rejectVoice(voiceReasonInvalidTravelDate, "Travel date must use YYYY-MM-DD"))
		return
	}

	userID := userIDValue.(int64)
	if h.userRepo == nil {
		response.Success(c, rejectVoice(voiceReasonUserNotFound, "User repository is unavailable"))
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		response.Success(c, rejectVoice(voiceReasonUserNotFound, "Registered user not found"))
		return
	}

	if err := user.CanLogin(); err != nil {
		response.Success(c, rejectVoice(voiceReasonUserInactive, "User account is inactive"))
		return
	}

	if strings.TrimSpace(user.FullName) == "" || strings.TrimSpace(user.Phone.String()) == "" {
		response.Success(c, rejectVoice(voiceReasonProfileIncomplete, "User profile is incomplete"))
		return
	}

	normalized := &VoiceBookingNormalizedCommand{
		UserID:              userID,
		Origin:              origin,
		Destination:         destination,
		TravelDate:          travelDate,
		SeatCount:           req.SeatCount,
		SeatPreferenceOrder: normalizeSeatPreference(req.SeatPreferenceOrder),
	}

	response.Success(c, &VoiceBookingValidationResponse{
		Accepted:      true,
		ReasonCode:    voiceReasonAccepted,
		Reason:        "Voice command accepted",
		Normalized:    normalized,
		ProfileSource: "user_profile",
		MaskedPhone:   maskPhone(user.Phone.String()),
		MaskedEmail:   maskEmail(user.Email.String()),
	})
}

func rejectVoice(code, reason string) *VoiceBookingValidationResponse {
	return &VoiceBookingValidationResponse{
		Accepted:   false,
		ReasonCode: code,
		Reason:     reason,
	}
}

func normalizeSeatPreference(seats []string) []string {
	if len(seats) == 0 {
		return nil
	}

	seen := make(map[string]bool)
	normalized := make([]string, 0, len(seats))
	for _, seat := range seats {
		value := strings.ToUpper(strings.TrimSpace(seat))
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		normalized = append(normalized, value)
	}
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

func maskPhone(phone string) string {
	if len(phone) <= 4 {
		return phone
	}
	return strings.Repeat("*", len(phone)-4) + phone[len(phone)-4:]
}

func maskEmail(email string) string {
	if email == "" {
		return ""
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "***"
	}
	local := parts[0]
	if len(local) <= 2 {
		return "**@" + parts[1]
	}
	return local[:1] + strings.Repeat("*", len(local)-2) + local[len(local)-1:] + "@" + parts[1]
}

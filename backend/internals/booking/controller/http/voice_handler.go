package http

import (
	"fmt"
	"strings"

	authDomain "backend/internals/auth/domain"
	bookingDto "backend/internals/booking/controller/dto"
	bookingDomain "backend/internals/booking/domain"
	bookingUsecase "backend/internals/booking/usecase"
	locationUsecase "backend/internals/location/usecase"
	tripDomain "backend/internals/trip/domain"
	tripUsecase "backend/internals/trip/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type VoiceExecuteRequest struct {
	TripID              *int64   `json:"tripId"`
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travelDate"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
	PaymentMethod       string   `json:"paymentMethod" binding:"omitempty,oneof=bank_transfer cod visa"`
}

type VoicePlanRequest struct {
	Origin              string   `json:"origin" binding:"required"`
	Destination         string   `json:"destination" binding:"required"`
	TravelDate          string   `json:"travelDate" binding:"required"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
}

type voiceTripCandidate struct {
	TripID             int64    `json:"tripId"`
	ProviderName       string   `json:"providerName,omitempty"`
	BusTypeName        string   `json:"busTypeName,omitempty"`
	OriginName         string   `json:"originName,omitempty"`
	DestinationName    string   `json:"destinationName,omitempty"`
	DepartureTime      string   `json:"departureTime"`
	ArrivalTime        string   `json:"arrivalTime"`
	FinalPrice         float64  `json:"finalPrice"`
	AvailableSeats     int32    `json:"availableSeats"`
	Status             string   `json:"status"`
	SuggestedSeatCodes []string `json:"suggestedSeatCodes,omitempty"`
}

type VoiceBookingHandler struct {
	bookingUC bookingUsecase.IBookingUseCase
	userRepo  authDomain.Repository
	locUC     locationUsecase.LocationUseCase
	tripUC    tripUsecase.ITripUseCase
}

func NewVoiceBookingHandler(
	bookingUC bookingUsecase.IBookingUseCase,
	userRepo authDomain.Repository,
	locUC locationUsecase.LocationUseCase,
	tripUC tripUsecase.ITripUseCase,
) *VoiceBookingHandler {
	return &VoiceBookingHandler{
		bookingUC: bookingUC,
		userRepo:  userRepo,
		locUC:     locUC,
		tripUC:    tripUC,
	}
}

// Execute handles POST /bookings/voice/execute.
// It is the full E2E gate: resolve user profile, route, trip, seats, then create booking.
func (h *VoiceBookingHandler) Execute(c *gin.Context) {
	var req VoiceExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}
	if err := validateExecuteRequest(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	userID, user, err := h.requireActiveUser(c)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	trip, err := h.selectTripForExecute(c, &req)
	if err != nil {
		response.HandleError(c, pkgErrors.ErrTripNotFound)
		return
	}

	seatCodes, err := allocateSeats(trip.BookedSeats, normalizeSeatPreference(req.SeatPreferenceOrder), req.SeatCount)
	if err != nil {
		response.HandleError(c, pkgErrors.ErrSeatsNotAvailable)
		return
	}

	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "bank_transfer"
	}

	input := &bookingDomain.CreateBookingInput{
		TripID:    trip.ID,
		UserID:    &userID,
		SeatCodes: seatCodes,
		GuestInfo: bookingDomain.GuestInfo{
			Name:  strings.TrimSpace(user.FullName),
			Phone: user.Phone.String(),
			Email: user.Email.String(),
		},
		PickupInfo: bookingDomain.PointInfo{
			Name: fallbackName(trip.OriginName, req.Origin),
		},
		DropoffInfo: bookingDomain.PointInfo{
			Name: fallbackName(trip.DestinationName, req.Destination),
		},
		PaymentMethod: paymentMethod,
	}

	out, err := h.bookingUC.CreateBooking(c.Request.Context(), input)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, gin.H{
		"flow":          "voice-e2e",
		"tripId":        trip.ID,
		"seatCodes":     seatCodes,
		"travelDate":    req.TravelDate,
		"origin":        fallbackName(trip.OriginName, req.Origin),
		"destination":   fallbackName(trip.DestinationName, req.Destination),
		"bookingResult": bookingDto.ToCreateBookingResponse(out),
	})
}

// Plan handles POST /bookings/voice/plan.
// Returns AI-ready trip candidates so user can choose before execute.
func (h *VoiceBookingHandler) Plan(c *gin.Context) {
	var req VoicePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	_, _, err := h.requireActiveUser(c)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	origin, destination, err := h.resolveLocations(c, req.Origin, req.Destination)
	if err != nil {
		response.HandleError(c, pkgErrors.ErrBadRequest)
		return
	}

	trips, _, err := h.tripUC.Search(c.Request.Context(), &tripDomain.SearchTripsInput{
		OriginID:      int32(origin.ID),
		DestinationID: int32(destination.ID),
		DepartureDate: req.TravelDate,
		MinSeats:      req.SeatCount,
		Page:          1,
		Limit:         5,
	})
	if err != nil || len(trips) == 0 {
		response.HandleError(c, pkgErrors.ErrTripNotFound)
		return
	}

	recommended := selectBestTrip(trips)
	candidates := make([]voiceTripCandidate, 0, len(trips))
	for _, trip := range trips {
		suggestedSeats, _ := allocateSeats(trip.BookedSeats, normalizeSeatPreference(req.SeatPreferenceOrder), req.SeatCount)
		candidates = append(candidates, voiceTripCandidate{
			TripID:             trip.ID,
			ProviderName:       trip.ProviderName,
			BusTypeName:        trip.BusTypeName,
			OriginName:         trip.OriginName,
			DestinationName:    trip.DestinationName,
			DepartureTime:      trip.DepartureTime.Format("2006-01-02T15:04:05Z07:00"),
			ArrivalTime:        trip.ArrivalTime.Format("2006-01-02T15:04:05Z07:00"),
			FinalPrice:         trip.FinalPrice(),
			AvailableSeats:     trip.AvailableSeats,
			Status:             trip.Status.String(),
			SuggestedSeatCodes: suggestedSeats,
		})
	}

	response.Success(c, gin.H{
		"flow":              "voice-plan",
		"origin":            fallbackName(recommended.OriginName, req.Origin),
		"destination":       fallbackName(recommended.DestinationName, req.Destination),
		"travelDate":        req.TravelDate,
		"seatCount":         req.SeatCount,
		"recommendedTripId": recommended.ID,
		"candidates":        candidates,
	})
}

func (h *VoiceBookingHandler) requireActiveUser(c *gin.Context) (int64, *authDomain.User, error) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		return 0, nil, pkgErrors.ErrUnauthorized
	}

	var userID int64
	switch v := userIDVal.(type) {
	case int64:
		userID = v
	case int:
		userID = int64(v)
	case float64:
		userID = int64(v)
	default:
		return 0, nil, pkgErrors.ErrUnauthorized
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		return 0, nil, pkgErrors.ErrUserNotFound
	}
	if err := user.CanLogin(); err != nil {
		return 0, nil, pkgErrors.ErrUserInactive
	}
	return userID, user, nil
}

func (h *VoiceBookingHandler) selectTripForExecute(c *gin.Context, req *VoiceExecuteRequest) (*tripDomain.Trip, error) {
	if req.TripID != nil {
		return h.tripUC.GetByID(c.Request.Context(), *req.TripID)
	}

	origin, destination, err := h.resolveLocations(c, req.Origin, req.Destination)
	if err != nil {
		return nil, err
	}

	trips, _, err := h.tripUC.Search(c.Request.Context(), &tripDomain.SearchTripsInput{
		OriginID:      int32(origin.ID),
		DestinationID: int32(destination.ID),
		DepartureDate: req.TravelDate,
		MinSeats:      req.SeatCount,
		Page:          1,
		Limit:         20,
	})
	if err != nil {
		return nil, err
	}

	return selectBestTrip(trips), nil
}

func validateExecuteRequest(req *VoiceExecuteRequest) error {
	if req.TripID != nil {
		return nil
	}
	if strings.TrimSpace(req.Origin) == "" {
		return fmt.Errorf("origin is required")
	}
	if strings.TrimSpace(req.Destination) == "" {
		return fmt.Errorf("destination is required")
	}
	if strings.TrimSpace(req.TravelDate) == "" {
		return fmt.Errorf("travelDate is required")
	}
	return nil
}

func (h *VoiceBookingHandler) resolveLocations(c *gin.Context, originText, destinationText string) (*locationResult, *locationResult, error) {
	origins, err := h.locUC.Search(c.Request.Context(), strings.TrimSpace(originText))
	if err != nil || len(origins) == 0 {
		return nil, nil, fmt.Errorf("origin not found")
	}
	dests, err := h.locUC.Search(c.Request.Context(), strings.TrimSpace(destinationText))
	if err != nil || len(dests) == 0 {
		return nil, nil, fmt.Errorf("destination not found")
	}

	origin := &locationResult{ID: int(origins[0].ID), Name: origins[0].Name}
	destination := &locationResult{ID: int(dests[0].ID), Name: dests[0].Name}
	if origin.ID == destination.ID {
		return nil, nil, fmt.Errorf("same location")
	}

	return origin, destination, nil
}

type locationResult struct {
	ID   int
	Name string
}

func selectBestTrip(trips []*tripDomain.Trip) *tripDomain.Trip {
	if len(trips) == 0 {
		return nil
	}

	for _, trip := range trips {
		if trip.Status == tripDomain.TripStatusScheduled {
			return trip
		}
	}
	return trips[0]
}

func allocateSeats(bookedSeats []string, preferred []string, seatCount int) ([]string, error) {
	booked := make(map[string]bool, len(bookedSeats))
	for _, seat := range bookedSeats {
		booked[strings.ToUpper(strings.TrimSpace(seat))] = true
	}

	if seats, ok := consecutiveFromCandidates(preferred, booked, seatCount); ok {
		return seats, nil
	}

	if seats, ok := scanFallbackConsecutive(booked, seatCount); ok {
		return seats, nil
	}

	return nil, fmt.Errorf("no suitable seats")
}

func normalizeSeatPreference(seats []string) []string {
	seen := make(map[string]bool)
	out := make([]string, 0, len(seats))
	for _, seat := range seats {
		norm := strings.ToUpper(strings.TrimSpace(seat))
		if norm == "" || seen[norm] {
			continue
		}
		seen[norm] = true
		out = append(out, norm)
	}
	return out
}

func consecutiveFromCandidates(candidates []string, booked map[string]bool, seatCount int) ([]string, bool) {
	if len(candidates) < seatCount || seatCount <= 0 {
		return nil, false
	}

	for i := 0; i <= len(candidates)-seatCount; i++ {
		window := candidates[i : i+seatCount]
		if !isWindowAvailable(window, booked) {
			continue
		}
		if err := bookingDomain.ValidateConsecutiveSeats(window); err == nil {
			return window, true
		}
	}

	return nil, false
}

func isWindowAvailable(window []string, booked map[string]bool) bool {
	for _, seat := range window {
		if booked[strings.ToUpper(strings.TrimSpace(seat))] {
			return false
		}
	}
	return true
}

func scanFallbackConsecutive(booked map[string]bool, seatCount int) ([]string, bool) {
	if seatCount <= 0 {
		return nil, false
	}

	for number := 1; number <= 60; number++ {
		window := make([]string, 0, seatCount)
		for row := 'A'; row <= 'Z' && len(window) < seatCount; row++ {
			seat := fmt.Sprintf("%c%d", row, number)
			if booked[seat] {
				continue
			}
			window = append(window, seat)
		}

		if len(window) < seatCount {
			continue
		}

		if err := bookingDomain.ValidateConsecutiveSeats(window); err == nil {
			return window, true
		}
	}

	return nil, false
}

func fallbackName(primary, fallback string) string {
	if strings.TrimSpace(primary) != "" {
		return primary
	}
	return strings.TrimSpace(fallback)
}

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
	Origin              string   `json:"origin" binding:"required"`
	Destination         string   `json:"destination" binding:"required"`
	TravelDate          string   `json:"travelDate" binding:"required"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
	PaymentMethod       string   `json:"paymentMethod" binding:"omitempty,oneof=bank_transfer cod visa"`
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

	userIDVal, ok := c.Get("userID")
	if !ok {
		response.HandleError(c, pkgErrors.ErrUnauthorized)
		return
	}
	userID := userIDVal.(int64)

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		response.HandleError(c, pkgErrors.ErrUserNotFound)
		return
	}
	if err := user.CanLogin(); err != nil {
		response.HandleError(c, pkgErrors.ErrUserInactive)
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
		Limit:         20,
	})
	if err != nil {
		response.HandleError(c, pkgErrors.ErrTripNotFound)
		return
	}

	trip := selectBestTrip(trips)
	if trip == nil {
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

	for row := 'A'; row <= 'Z'; row++ {
		for start := 1; start <= 60-seatCount; start++ {
			window := make([]string, 0, seatCount)
			blocked := false
			for i := 0; i < seatCount; i++ {
				seat := fmt.Sprintf("%c%d", row, start+i)
				if booked[seat] {
					blocked = true
					break
				}
				window = append(window, seat)
			}
			if blocked {
				continue
			}
			if err := bookingDomain.ValidateConsecutiveSeats(window); err == nil {
				return window, true
			}
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

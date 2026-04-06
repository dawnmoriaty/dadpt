package http

import (
	"context"
	"fmt"
	"strings"

	bookingDto "backend/internals/booking/controller/dto"
	bookingDomain "backend/internals/booking/domain"
	tripDomain "backend/internals/trip/domain"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

func (h *VoiceBookingHandler) Execute(c *gin.Context) {
	var req bookingDto.VoiceExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}
	if err := validateExecuteRequest(&req); err != nil {
		response.HandleError(c, err)
		return
	}

	userID, err := ExtractUserID(c)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	result, err := h.ExecuteDirect(c.Request.Context(), userID, &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Created(c, result)
}

func (h *VoiceBookingHandler) ExecuteDirect(ctx context.Context, userID int64, req *bookingDto.VoiceExecuteRequest) (*bookingDto.VoiceExecuteResponse, error) {
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, pkgErrors.ErrUserNotFound
	}
	if err := user.CanLogin(); err != nil {
		return nil, pkgErrors.ErrUserInactive
	}

	originIDs, destIDs, originName, destName, err := h.resolveExecuteLocations(ctx, req)
	if err != nil {
		return nil, err
	}

	trip, err := h.selectTripForExecute(ctx, req, originIDs, destIDs)
	if err != nil {
		return nil, bookingDomain.ErrVoiceTripNotFound
	}

	reusable := h.findReusablePendingBooking(ctx, userID, trip.ID)
	if reusable != nil {
		return &bookingDto.VoiceExecuteResponse{
			Flow:          "voice-e2e-reuse",
			TripID:        trip.ID,
			SeatCodes:     reusable.Booking.SeatCodes,
			TravelDate:    trip.DepartureTime.Format("2006-01-02"),
			Origin:        fallbackName(trip.OriginName, originName),
			Destination:   fallbackName(trip.DestinationName, destName),
			BookingResult: bookingDto.ToCreateBookingResponse(reusable),
		}, nil
	}

	seatCodes, err := allocateSeats(trip.BookedSeats, normalizeSeatPreference(req.SeatPreferenceOrder), req.SeatCount)
	if err != nil {
		fallbackTrip, fallbackSeats, fallbackFound := h.tryFallbackTrip(ctx, originIDs, destIDs, req, trip.ID)
		if !fallbackFound {
			return nil, bookingDomain.ErrVoiceNoSeats
		}
		trip = fallbackTrip
		seatCodes = fallbackSeats
	}

	paymentMethod := "cod"

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
			Name: fallbackName(trip.OriginName, originName),
		},
		DropoffInfo: bookingDomain.PointInfo{
			Name: fallbackName(trip.DestinationName, destName),
		},
		PaymentMethod: paymentMethod,
	}

	out, err := h.bookingUC.CreateBooking(ctx, input)
	if err != nil {
		return nil, mapDomainError(err)
	}

	return &bookingDto.VoiceExecuteResponse{
		Flow:          "voice-e2e",
		TripID:        trip.ID,
		SeatCodes:     seatCodes,
		TravelDate:    trip.DepartureTime.Format("2006-01-02"),
		Origin:        fallbackName(trip.OriginName, originName),
		Destination:   fallbackName(trip.DestinationName, destName),
		BookingResult: bookingDto.ToCreateBookingResponse(out),
	}, nil
}

func (h *VoiceBookingHandler) resolveExecuteLocations(ctx context.Context, req *bookingDto.VoiceExecuteRequest) ([]int32, []int32, string, string, error) {
	if req.TripID != nil {
		return nil, nil, req.Origin, req.Destination, nil
	}

	origins, destinations, err := h.resolveLocationsCtx(ctx, req.Origin, req.Destination)
	if err != nil {
		return nil, nil, "", "", err
	}

	var originIDs []int32
	for _, o := range origins {
		originIDs = append(originIDs, int32(o.ID))
	}
	var destIDs []int32
	for _, d := range destinations {
		destIDs = append(destIDs, int32(d.ID))
	}

	return originIDs, destIDs, origins[0].Name, destinations[0].Name, nil
}

func (h *VoiceBookingHandler) selectTripForExecute(ctx context.Context, req *bookingDto.VoiceExecuteRequest, originIDs, destIDs []int32) (*tripDomain.Trip, error) {
	if req.TripID != nil {
		return h.tripUC.GetByID(ctx, *req.TripID)
	}

	travelDate := normalizeVoiceTravelDate(req.TravelDate)

	trips, _, err := h.searchTripsForVoice(ctx, originIDs, destIDs, travelDate, req.SeatCount, 20)
	if err != nil {
		return nil, err
	}
	if len(trips) == 0 {
		return nil, fmt.Errorf("trip not found")
	}

	return selectBestTrip(trips), nil
}

func (h *VoiceBookingHandler) findReusablePendingBooking(ctx context.Context, userID int64, tripID int64) *bookingDomain.BookingOutput {
	list, err := h.bookingUC.ListUserBookings(ctx, &bookingDomain.ListBookingsInput{
		UserID:   userID,
		Page:     1,
		PageSize: 10,
	})
	if err != nil || list == nil {
		return nil
	}

	for _, booking := range list.Bookings {
		if booking == nil {
			continue
		}
		if booking.TripID != tripID || booking.Status != bookingDomain.StatusPending {
			continue
		}

		return &bookingDomain.BookingOutput{Booking: booking}
	}

	return nil
}

func validateExecuteRequest(req *bookingDto.VoiceExecuteRequest) error {
	if req.TripID != nil {
		return nil
	}
	if strings.TrimSpace(req.Origin) == "" {
		return bookingDomain.ErrVoiceMissingFields
	}
	if strings.TrimSpace(req.Destination) == "" {
		return bookingDomain.ErrVoiceMissingFields
	}
	if strings.TrimSpace(req.TravelDate) == "" {
		return bookingDomain.ErrVoiceMissingFields
	}
	return nil
}

func (h *VoiceBookingHandler) tryFallbackTrip(ctx context.Context, originIDs, destIDs []int32, req *bookingDto.VoiceExecuteRequest, excludeTripID int64) (*tripDomain.Trip, []string, bool) {
	if req.TripID != nil {
		return nil, nil, false
	}

	travelDate := normalizeVoiceTravelDate(req.TravelDate)
	trips, _, err := h.searchTripsForVoice(ctx, originIDs, destIDs, travelDate, req.SeatCount, 20)
	if err != nil || len(trips) == 0 {
		return nil, nil, false
	}

	seatPreference := normalizeSeatPreference(req.SeatPreferenceOrder)
	for _, candidate := range trips {
		if candidate == nil || candidate.ID == excludeTripID {
			continue
		}

		seatCodes, seatErr := allocateSeats(candidate.BookedSeats, seatPreference, req.SeatCount)
		if seatErr != nil {
			continue
		}

		return candidate, seatCodes, true
	}

	return nil, nil, false
}

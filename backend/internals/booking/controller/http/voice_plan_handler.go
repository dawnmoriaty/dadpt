package http

import (
	"context"
	"fmt"
	"strings"
	"time"

	bookingDto "backend/internals/booking/controller/dto"
	bookingDomain "backend/internals/booking/domain"
	locationDomain "backend/internals/location/domain"
	tripDomain "backend/internals/trip/domain"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

func (h *VoiceBookingHandler) Plan(c *gin.Context) {
	var req bookingDto.VoicePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	userID, err := ExtractUserID(c)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	result, err := h.PlanDirect(c.Request.Context(), userID, &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *VoiceBookingHandler) PlanDirect(ctx context.Context, userID int64, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, pkgErrors.ErrUserNotFound
	}
	if err := user.CanLogin(); err != nil {
		return nil, pkgErrors.ErrUserInactive
	}

	return h.planCore(ctx, req)
}

func (h *VoiceBookingHandler) PlanByRoute(ctx context.Context, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	return h.planCore(ctx, req)
}

func (h *VoiceBookingHandler) planCore(ctx context.Context, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	seatCount := req.SeatCount
	if seatCount <= 0 {
		seatCount = 1
	}

	origins, destinations, err := h.resolveLocationsCtx(ctx, req.Origin, req.Destination)
	if err != nil {
		return nil, err
	}

	travelDate := normalizeVoiceTravelDate(req.TravelDate)

	var originIDs []int32
	for _, o := range origins {
		originIDs = append(originIDs, int32(o.ID))
	}
	var destinationIDs []int32
	for _, d := range destinations {
		destinationIDs = append(destinationIDs, int32(d.ID))
	}

	trips, _, err := h.searchTripsForVoice(ctx, originIDs, destinationIDs, travelDate, seatCount, 5)
	if err != nil || len(trips) == 0 {
		return nil, bookingDomain.ErrVoiceNoTrips
	}

	recommended := selectBestTrip(trips)
	actualTravelDate := recommended.DepartureTime.Format("2006-01-02")
	candidates := make([]bookingDto.VoiceTripCandidate, 0, len(trips))
	for _, trip := range trips {
		suggestedSeats, _ := allocateSeats(trip.BookedSeats, normalizeSeatPreference(req.SeatPreferenceOrder), seatCount)
		candidates = append(candidates, bookingDto.VoiceTripCandidate{
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

	return &bookingDto.VoicePlanResponse{
		Flow:              "voice-plan",
		Origin:            fallbackName(recommended.OriginName, req.Origin),
		Destination:       fallbackName(recommended.DestinationName, req.Destination),
		TravelDate:        actualTravelDate,
		SeatCount:         seatCount,
		RecommendedTripID: recommended.ID,
		Candidates:        candidates,
	}, nil
}

func (h *VoiceBookingHandler) searchTripsForVoice(ctx context.Context, originIDs, destinationIDs []int32, travelDate string, minSeats int, limit int) ([]*tripDomain.Trip, int64, error) {
	if minSeats <= 0 {
		minSeats = 1
	}

	if strings.EqualFold(strings.TrimSpace(travelDate), "auto") {
		start := time.Now()
		for dayOffset := 0; dayOffset <= 14; dayOffset++ {
			date := start.AddDate(0, 0, dayOffset).Format("2006-01-02")
			for _, originID := range originIDs {
				for _, destinationID := range destinationIDs {
					trips, total, err := h.tripUC.Search(ctx, &tripDomain.SearchTripsInput{
						OriginID:      originID,
						DestinationID: destinationID,
						DepartureDate: date,
						MinSeats:      minSeats,
						Page:          1,
						Limit:         limit,
					})
					if err == nil && len(trips) > 0 {
						return trips, total, nil
					}
				}
			}
		}
		return nil, 0, fmt.Errorf("no upcoming trip found")
	}

	for _, originID := range originIDs {
		for _, destinationID := range destinationIDs {
			trips, total, err := h.tripUC.Search(ctx, &tripDomain.SearchTripsInput{
				OriginID:      originID,
				DestinationID: destinationID,
				DepartureDate: travelDate,
				MinSeats:      minSeats,
				Page:          1,
				Limit:         limit,
			})
			if err == nil && len(trips) > 0 {
				return trips, total, nil
			}
		}
	}

	requestedDate, parseErr := time.Parse("2006-01-02", strings.TrimSpace(travelDate))
	if parseErr != nil {
		return nil, 0, fmt.Errorf("no trips match requested date")
	}

	for dayOffset := 1; dayOffset <= 14; dayOffset++ {
		nextDate := requestedDate.AddDate(0, 0, dayOffset).Format("2006-01-02")
		for _, originID := range originIDs {
			for _, destinationID := range destinationIDs {
				nextTrips, nextTotal, nextErr := h.tripUC.Search(ctx, &tripDomain.SearchTripsInput{
					OriginID:      originID,
					DestinationID: destinationID,
					DepartureDate: nextDate,
					MinSeats:      minSeats,
					Page:          1,
					Limit:         limit,
				})
				if nextErr == nil && len(nextTrips) > 0 {
					return nextTrips, nextTotal, nil
				}
			}
		}
	}

	return nil, 0, fmt.Errorf("no upcoming trip found")
}

func selectBestTrip(trips []*tripDomain.Trip) *tripDomain.Trip {
	if len(trips) == 0 {
		return nil
	}

	var bestScheduled *tripDomain.Trip
	for _, trip := range trips {
		if trip.Status != tripDomain.TripStatusScheduled {
			continue
		}
		if bestScheduled == nil || trip.DepartureTime.Before(bestScheduled.DepartureTime) {
			bestScheduled = trip
		}
	}
	if bestScheduled != nil {
		return bestScheduled
	}

	best := trips[0]
	for _, trip := range trips[1:] {
		if trip.DepartureTime.Before(best.DepartureTime) {
			best = trip
		}
	}

	return best
}

func (h *VoiceBookingHandler) resolveLocationsCtx(ctx context.Context, originText, destinationText string) ([]*locationResult, []*locationResult, error) {
	origins, err := h.resolveLocationCtx(ctx, originText)
	if err != nil {
		return nil, nil, bookingDomain.ErrVoiceOriginNotFound
	}
	destinations, err := h.resolveLocationCtx(ctx, destinationText)
	if err != nil {
		return nil, nil, bookingDomain.ErrVoiceDestinationNotFound
	}
	return origins, destinations, nil
}

func (h *VoiceBookingHandler) resolveLocationCtx(ctx context.Context, text string) ([]*locationResult, error) {
	queries := buildLocationQueries(text)
	candidatesByID := make(map[int32]*locationDomain.Location)

	for _, query := range queries {
		locations, err := h.locUC.Search(ctx, query, locationDomain.DefaultSearchLimit)
		if err != nil {
			continue
		}
		for _, loc := range locations {
			if loc == nil {
				continue
			}
			if _, exists := candidatesByID[loc.ID]; !exists {
				candidatesByID[loc.ID] = loc
			}
		}
	}

	candidates := make([]*locationDomain.Location, 0, len(candidatesByID))
	for _, loc := range candidatesByID {
		candidates = append(candidates, loc)
	}

	if len(candidates) == 0 {
		allLocations, _, err := h.locUC.List(ctx, &locationDomain.LocationFilter{Limit: 1000, Offset: 0})
		if err != nil {
			return nil, err
		}
		candidates = allLocations
	}

	bestMatches := pickTopLocationMatches(text, candidates, 4)
	if len(bestMatches) == 0 {
		return nil, fmt.Errorf("location not found")
	}

	var results []*locationResult
	for _, b := range bestMatches {
		results = append(results, &locationResult{ID: int(b.ID), Name: b.Name})
	}

	return results, nil
}

func ExtractUserID(c *gin.Context) (int64, error) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		return 0, pkgErrors.ErrUnauthorized
	}
	switch v := userIDVal.(type) {
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	case float64:
		return int64(v), nil
	default:
		return 0, pkgErrors.ErrUnauthorized
	}
}

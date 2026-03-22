package http

import (
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode"

	authDomain "backend/internals/auth/domain"
	bookingDto "backend/internals/booking/controller/dto"
	bookingDomain "backend/internals/booking/domain"
	bookingUsecase "backend/internals/booking/usecase"
	locationDomain "backend/internals/location/domain"
	locationUsecase "backend/internals/location/usecase"
	tripDomain "backend/internals/trip/domain"
	tripUsecase "backend/internals/trip/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/unicode/norm"
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

	reusable := h.findReusablePendingBooking(c, userID, trip.ID)
	if reusable != nil {
		response.Success(c, gin.H{
			"flow":          "voice-e2e-reuse",
			"tripId":        trip.ID,
			"seatCodes":     reusable.Booking.SeatCodes,
			"travelDate":    req.TravelDate,
			"origin":        fallbackName(trip.OriginName, req.Origin),
			"destination":   fallbackName(trip.DestinationName, req.Destination),
			"bookingResult": bookingDto.ToCreateBookingResponse(reusable),
		})
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

func (h *VoiceBookingHandler) findReusablePendingBooking(c *gin.Context, userID int64, tripID int64) *bookingDomain.BookingOutput {
	list, err := h.bookingUC.ListUserBookings(c.Request.Context(), &bookingDomain.ListBookingsInput{
		UserID:   userID,
		Page:     1,
		PageSize: 20,
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

		output := &bookingDomain.BookingOutput{Booking: booking}
		paymentTx, txErr := h.bookingUC.GetPendingPaymentByBookingID(c.Request.Context(), booking.ID)
		if txErr != nil || paymentTx == nil {
			return output
		}

		output.OrderCode = paymentTx.OrderCode
		output.PaymentURL = strings.TrimSpace(paymentTx.CheckoutURL)
		output.QRCode = strings.TrimSpace(paymentTx.QRCode)

		if h.bookingUC.GatewayAvailable() {
			regen, regenErr := h.bookingUC.RegeneratePaymentLink(c.Request.Context(), booking, paymentTx)
			if regenErr == nil && regen != nil {
				output.PaymentURL = strings.TrimSpace(regen.PaymentURL)
				output.QRCode = strings.TrimSpace(regen.QRCode)
			}
		}

		return output
	}

	return nil
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

	travelDate := strings.TrimSpace(req.TravelDate)
	if travelDate == "" {
		travelDate = "auto"
	}

	trips, _, err := h.searchTripsForVoice(c, int32(origin.ID), int32(destination.ID), travelDate, req.SeatCount, 5)
	if err != nil || len(trips) == 0 {
		response.HandleError(c, pkgErrors.ErrTripNotFound)
		return
	}

	if req.TravelDate == "" {
		req.TravelDate = trips[0].DepartureTime.Format("2006-01-02")
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

	travelDate := strings.TrimSpace(req.TravelDate)
	if travelDate == "" {
		travelDate = "auto"
	}

	trips, _, err := h.searchTripsForVoice(c, int32(origin.ID), int32(destination.ID), travelDate, req.SeatCount, 20)
	if err != nil {
		return nil, err
	}
	if len(trips) == 0 {
		return nil, fmt.Errorf("trip not found")
	}

	return selectBestTrip(trips), nil
}

func (h *VoiceBookingHandler) searchTripsForVoice(c *gin.Context, originID, destinationID int32, travelDate string, minSeats int, limit int) ([]*tripDomain.Trip, int64, error) {
	if minSeats <= 0 {
		minSeats = 1
	}

	if strings.EqualFold(strings.TrimSpace(travelDate), "auto") {
		start := time.Now()
		for dayOffset := 0; dayOffset <= 14; dayOffset++ {
			date := start.AddDate(0, 0, dayOffset).Format("2006-01-02")
			trips, total, err := h.tripUC.Search(c.Request.Context(), &tripDomain.SearchTripsInput{
				OriginID:      originID,
				DestinationID: destinationID,
				DepartureDate: date,
				MinSeats:      minSeats,
				Page:          1,
				Limit:         limit,
			})
			if err != nil {
				continue
			}
			if len(trips) > 0 {
				return trips, total, nil
			}
		}
		return nil, 0, fmt.Errorf("no upcoming trip found")
	}

	trips, total, err := h.tripUC.Search(c.Request.Context(), &tripDomain.SearchTripsInput{
		OriginID:      originID,
		DestinationID: destinationID,
		DepartureDate: travelDate,
		MinSeats:      minSeats,
		Page:          1,
		Limit:         limit,
	})
	if err != nil {
		return nil, 0, err
	}
	if len(trips) > 0 {
		return trips, total, nil
	}

	requestedDate, parseErr := time.Parse("2006-01-02", strings.TrimSpace(travelDate))
	if parseErr != nil {
		return trips, total, nil
	}

	for dayOffset := 1; dayOffset <= 14; dayOffset++ {
		nextDate := requestedDate.AddDate(0, 0, dayOffset).Format("2006-01-02")
		nextTrips, nextTotal, nextErr := h.tripUC.Search(c.Request.Context(), &tripDomain.SearchTripsInput{
			OriginID:      originID,
			DestinationID: destinationID,
			DepartureDate: nextDate,
			MinSeats:      minSeats,
			Page:          1,
			Limit:         limit,
		})
		if nextErr != nil {
			continue
		}
		if len(nextTrips) > 0 {
			return nextTrips, nextTotal, nil
		}
	}

	return trips, total, nil
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
	origin, err := h.resolveLocation(c, originText)
	if err != nil {
		return nil, nil, fmt.Errorf("origin not found")
	}

	destination, err := h.resolveLocation(c, destinationText)
	if err != nil {
		return nil, nil, fmt.Errorf("destination not found")
	}
	if origin.ID == destination.ID {
		return nil, nil, fmt.Errorf("same location")
	}

	return origin, destination, nil
}

func (h *VoiceBookingHandler) resolveLocation(c *gin.Context, text string) (*locationResult, error) {
	queries := buildLocationQueries(text)
	candidatesByID := make(map[int32]*locationDomain.Location)

	for _, query := range queries {
		locations, err := h.locUC.Search(c.Request.Context(), query)
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
		allLocations, _, err := h.locUC.List(c.Request.Context(), &locationDomain.LocationFilter{Limit: 1000, Offset: 0})
		if err != nil {
			return nil, err
		}
		candidates = allLocations
	}

	best := pickBestLocationMatch(text, candidates)
	if best == nil {
		return nil, fmt.Errorf("location not found")
	}

	return &locationResult{ID: int(best.ID), Name: best.Name}, nil
}

func buildLocationQueries(text string) []string {
	raw := strings.TrimSpace(text)
	if raw == "" {
		return nil
	}

	normalized := normalizeLocationText(raw)
	stripped := stripLocationNoise(normalized)

	queries := []string{raw}
	if stripped != "" && !strings.EqualFold(stripped, raw) {
		queries = append(queries, stripped)
	}
	if normalized != "" && !strings.EqualFold(normalized, raw) && !strings.EqualFold(normalized, stripped) {
		queries = append(queries, normalized)
	}

	out := make([]string, 0, len(queries))
	seen := make(map[string]bool)
	for _, item := range queries {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, strings.TrimSpace(item))
	}

	return out
}

func pickBestLocationMatch(target string, candidates []*locationDomain.Location) *locationDomain.Location {
	normTarget := stripLocationNoise(normalizeLocationText(target))
	if normTarget == "" {
		return nil
	}

	type scored struct {
		loc   *locationDomain.Location
		score int
	}
	scoredCandidates := make([]scored, 0, len(candidates))

	for _, loc := range candidates {
		if loc == nil {
			continue
		}
		score := scoreLocationMatch(normTarget, loc)
		if score > 0 {
			scoredCandidates = append(scoredCandidates, scored{loc: loc, score: score})
		}
	}

	if len(scoredCandidates) == 0 {
		return nil
	}

	sort.Slice(scoredCandidates, func(i, j int) bool {
		if scoredCandidates[i].score == scoredCandidates[j].score {
			return scoredCandidates[i].loc.ID < scoredCandidates[j].loc.ID
		}
		return scoredCandidates[i].score > scoredCandidates[j].score
	})

	if scoredCandidates[0].score < 30 {
		return nil
	}

	return scoredCandidates[0].loc
}

func scoreLocationMatch(target string, location *locationDomain.Location) int {
	name := stripLocationNoise(normalizeLocationText(location.Name))
	if name == "" {
		return 0
	}

	if name == target {
		return 100
	}

	if strings.Contains(name, target) || strings.Contains(target, name) {
		return 90
	}

	targetTokens := strings.Fields(target)
	nameTokens := strings.Fields(name)
	if len(targetTokens) == 0 || len(nameTokens) == 0 {
		return 0
	}

	set := make(map[string]bool, len(nameTokens))
	for _, token := range nameTokens {
		set[token] = true
	}

	overlap := 0
	for _, token := range targetTokens {
		if set[token] {
			overlap++
		}
	}

	score := overlap * 20
	if strings.Contains(normalizeLocationText(location.City), target) {
		score += 10
	}
	if strings.Contains(normalizeLocationText(location.Keywords), target) {
		score += 20
	}

	return score
}

func stripLocationNoise(text string) string {
	value := strings.TrimSpace(strings.ToLower(text))
	value = strings.ReplaceAll(value, "ben xe", "")
	value = strings.ReplaceAll(value, "bx", "")
	value = strings.ReplaceAll(value, "tram", "")
	return strings.TrimSpace(strings.Join(strings.Fields(value), " "))
}

func normalizeLocationText(text string) string {
	trimmed := strings.TrimSpace(strings.ToLower(text))
	if trimmed == "" {
		return ""
	}

	normValue := norm.NFD.String(trimmed)
	builder := strings.Builder{}
	builder.Grow(len(normValue))
	for _, r := range normValue {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		switch r {
		case 'đ':
			builder.WriteRune('d')
		default:
			builder.WriteRune(r)
		}
	}

	return strings.Join(strings.Fields(builder.String()), " ")
}

type locationResult struct {
	ID   int
	Name string
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

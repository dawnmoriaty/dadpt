package dto

// VoiceExecuteRequest is the request body for /bookings/voice/execute.
type VoiceExecuteRequest struct {
	TripID              *int64   `json:"tripId"`
	Origin              string   `json:"origin"`
	Destination         string   `json:"destination"`
	TravelDate          string   `json:"travelDate"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
}

// VoicePlanRequest is the request body for /bookings/voice/plan.
type VoicePlanRequest struct {
	Origin              string   `json:"origin" binding:"required"`
	Destination         string   `json:"destination" binding:"required"`
	TravelDate          string   `json:"travelDate" binding:"required"`
	SeatCount           int      `json:"seatCount" binding:"required,min=1,max=4"`
	SeatPreferenceOrder []string `json:"seatPreferenceOrder"`
}

// VoiceTripCandidate represents a candidate trip for voice booking suggestions.
type VoiceTripCandidate struct {
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

// VoicePlanResponse is the typed response for PlanDirect.
type VoicePlanResponse struct {
	Flow              string               `json:"flow"`
	Origin            string               `json:"origin"`
	Destination       string               `json:"destination"`
	TravelDate        string               `json:"travelDate"`
	SeatCount         int                  `json:"seatCount"`
	RecommendedTripID int64                `json:"recommendedTripId"`
	Candidates        []VoiceTripCandidate `json:"candidates"`
}

// VoiceExecuteResponse is the typed response for ExecuteDirect.
type VoiceExecuteResponse struct {
	Flow          string                 `json:"flow"`
	TripID        int64                  `json:"tripId"`
	SeatCodes     []string               `json:"seatCodes"`
	TravelDate    string                 `json:"travelDate"`
	Origin        string                 `json:"origin"`
	Destination   string                 `json:"destination"`
	BookingResult *CreateBookingResponse `json:"bookingResult"`
}

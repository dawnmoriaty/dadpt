package http

import (
	"testing"
	"time"

	tripDomain "backend/internals/trip/domain"
)

func TestAllocateSeats_UsesPreferredConsecutive(t *testing.T) {
	seats, err := allocateSeats(
		[]string{"C1"},
		[]string{"A1", "B1", "C1"},
		2,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(seats) != 2 || seats[0] != "A1" || seats[1] != "B1" {
		t.Fatalf("unexpected seats: %v", seats)
	}
}

func TestAllocateSeats_FallbackWhenPreferredInvalid(t *testing.T) {
	seats, err := allocateSeats(
		[]string{"A1", "A2", "A3"},
		[]string{"A1", "A4"},
		2,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(seats) != 2 {
		t.Fatalf("expected 2 seats, got %d", len(seats))
	}
}

func TestValidateExecuteRequest_WithTripIDOnly(t *testing.T) {
	tripID := int64(10)
	req := &VoiceExecuteRequest{TripID: &tripID, SeatCount: 1}
	if err := validateExecuteRequest(req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSelectBestTrip_PrefersScheduled(t *testing.T) {
	items := []*tripDomain.Trip{
		{ID: 1, Status: tripDomain.TripStatusDeparted},
		{ID: 2, Status: tripDomain.TripStatusScheduled},
	}

	best := selectBestTrip(items)
	if best == nil || best.ID != 2 {
		t.Fatalf("expected trip id 2, got %+v", best)
	}
}

func TestSelectBestTrip_PrefersEarliestDepartureAmongScheduled(t *testing.T) {
	now := time.Now()
	items := []*tripDomain.Trip{
		{ID: 1, Status: tripDomain.TripStatusScheduled, DepartureTime: now.Add(5 * time.Hour)},
		{ID: 2, Status: tripDomain.TripStatusScheduled, DepartureTime: now.Add(2 * time.Hour)},
	}

	best := selectBestTrip(items)
	if best == nil || best.ID != 2 {
		t.Fatalf("expected earliest scheduled trip id 2, got %+v", best)
	}
}

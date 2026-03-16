package http

import "testing"

func TestAllocateSeats_UsesPreferredConsecutive(t *testing.T) {
	seats, err := allocateSeats(
		[]string{"A3"},
		[]string{"A1", "A2", "A3"},
		2,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(seats) != 2 || seats[0] != "A1" || seats[1] != "A2" {
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

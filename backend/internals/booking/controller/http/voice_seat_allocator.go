package http

import (
	"fmt"
	"strings"

	bookingDomain "backend/internals/booking/domain"
)

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

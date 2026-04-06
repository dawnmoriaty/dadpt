package domain

import (
	pkgErrors "backend/pkgs/errors"
)

// ── Voice-specific sentinel errors (GLOBAL-006 compliance) ──

var (
	// ErrVoiceOriginNotFound indicates the origin location text could not be resolved.
	ErrVoiceOriginNotFound = pkgErrors.Wrap(nil, 400, "VOICE_ORIGIN_NOT_FOUND")

	// ErrVoiceDestinationNotFound indicates the destination location text could not be resolved.
	ErrVoiceDestinationNotFound = pkgErrors.Wrap(nil, 400, "VOICE_DESTINATION_NOT_FOUND")

	// ErrVoiceSameLocation indicates origin and destination resolved to the same location.
	ErrVoiceSameLocation = pkgErrors.Wrap(nil, 400, "VOICE_SAME_LOCATION")

	// ErrVoiceNoTrips indicates no trips found matching the voice search criteria.
	ErrVoiceNoTrips = pkgErrors.Wrap(nil, 404, "VOICE_NO_TRIPS")

	// ErrVoiceTripNotFound indicates the specified tripID was not found.
	ErrVoiceTripNotFound = pkgErrors.Wrap(nil, 404, "VOICE_TRIP_NOT_FOUND")

	// ErrVoiceNoSeats indicates no suitable seats available on any matching trip.
	ErrVoiceNoSeats = pkgErrors.Wrap(nil, 409, "VOICE_NO_SEATS")

	// ErrVoiceMissingFields indicates required voice booking fields are missing.
	ErrVoiceMissingFields = pkgErrors.Wrap(nil, 400, "VOICE_MISSING_FIELDS")
)

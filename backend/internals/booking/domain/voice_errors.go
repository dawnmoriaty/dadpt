package domain

import (
	pkgErrors "backend/pkgs/errors"
)


var (
	ErrVoiceOriginNotFound = pkgErrors.Wrap(nil, 400, "VOICE_ORIGIN_NOT_FOUND")

	ErrVoiceDestinationNotFound = pkgErrors.Wrap(nil, 400, "VOICE_DESTINATION_NOT_FOUND")

	ErrVoiceSameLocation = pkgErrors.Wrap(nil, 400, "VOICE_SAME_LOCATION")

	ErrVoiceNoTrips = pkgErrors.Wrap(nil, 404, "VOICE_NO_TRIPS")

	ErrVoiceTripNotFound = pkgErrors.Wrap(nil, 404, "VOICE_TRIP_NOT_FOUND")

	ErrVoiceNoSeats = pkgErrors.Wrap(nil, 409, "VOICE_NO_SEATS")

	ErrVoiceMissingFields = pkgErrors.Wrap(nil, 400, "VOICE_MISSING_FIELDS")
)

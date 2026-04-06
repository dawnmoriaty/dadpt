package http

import (
	authDomain "backend/internals/auth/domain"
	bookingUsecase "backend/internals/booking/usecase"
	locationUsecase "backend/internals/location/usecase"
	tripUsecase "backend/internals/trip/usecase"
)

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

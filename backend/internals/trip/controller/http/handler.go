package http

import (
	"errors"
	"strconv"

	"backend/internals/trip/controller/dto"
	"backend/internals/trip/domain"
	"backend/internals/trip/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type TripHandler struct {
	uc usecase.ITripUseCase
}

func NewTripHandler(uc usecase.ITripUseCase) *TripHandler {
	return &TripHandler{uc: uc}
}

func (h *TripHandler) Search(c *gin.Context) {
	var req dto.SearchTripsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	trips, total, err := h.uc.Search(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	pg := &paging.Paging{Page: req.Page, Limit: req.Limit}
	pg.Process()

	response.Success(c, paging.Of(dto.ToTripResponseList(trips), total, pg.Page))
}

func (h *TripHandler) Browse(c *gin.Context) {
	var req dto.BrowseTripsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	trips, total, err := h.uc.Browse(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	pg := &paging.Paging{Page: req.Page, Limit: req.Limit}
	pg.Process()

	response.Success(c, paging.Of(dto.ToTripResponseList(trips), total, pg.Page))
}

func (h *TripHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("trip"))
		return
	}

	trip, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToTripResponse(trip))
}

func (h *TripHandler) Create(c *gin.Context) {
	var req dto.CreateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	trip, err := h.uc.Create(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToTripResponse(trip))
}

func (h *TripHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("trip"))
		return
	}

	var req dto.UpdateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	trip, err := h.uc.Update(c.Request.Context(), id, req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToTripResponse(trip))
}

func (h *TripHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("trip"))
		return
	}

	var req dto.UpdateTripStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	trip, err := h.uc.UpdateStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToTripResponse(trip))
}

func (h *TripHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("trip"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, gin.H{"message": "Trip deleted"})
}

func (h *TripHandler) List(c *gin.Context) {
	var pg paging.Paging
	if err := c.ShouldBindQuery(&pg); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}
	pg.Process()

	var req dto.AdminTripListRequest
	c.ShouldBindQuery(&req)

	trips, total, err := h.uc.List(c.Request.Context(), &pg, req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, paging.Of(dto.ToTripResponseList(trips), total, pg.Page))
}


func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrTripStatusInvalid):
		return pkgErrors.ErrInvalidTripStatus
	case errors.Is(err, domain.ErrTripTransitionInvalid):
		return pkgErrors.ErrTripTransitionInvalid
	case errors.Is(err, domain.ErrTripDepartureInPast):
		return pkgErrors.ErrTripDepartureInPast
	case errors.Is(err, domain.ErrArrivalBeforeDeparture):
		return pkgErrors.ErrArrivalBeforeDeparture
	case errors.Is(err, domain.ErrTripProviderRequired):
		return pkgErrors.ErrTripProviderRequired
	case errors.Is(err, domain.ErrTripOriginRequired):
		return pkgErrors.ErrTripOriginRequired
	case errors.Is(err, domain.ErrTripDestinationRequired):
		return pkgErrors.ErrTripDestRequired
	case errors.Is(err, domain.ErrTripPriceInvalid):
		return pkgErrors.ErrTripPriceInvalid
	case errors.Is(err, domain.ErrTripCannotModify):
		return pkgErrors.ErrTripCannotModify
	case errors.Is(err, domain.ErrTripCannotDelete):
		return pkgErrors.ErrTripCannotDelete
	case errors.Is(err, domain.ErrTripHasActiveBookings):
		return pkgErrors.ErrTripHasActiveBookings
	case errors.Is(err, domain.ErrInvalidInput):
		return pkgErrors.ErrInvalidInput
	case errors.Is(err, domain.ErrTripNotFound):
		return pkgErrors.ErrTripNotFound
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

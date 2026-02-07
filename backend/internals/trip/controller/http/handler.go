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
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	trips, total, err := h.uc.Search(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	pg := &paging.Paging{Page: req.Page, PageSize: req.Limit}
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
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
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
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
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
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
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
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
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

// =============================================================================
// ERROR MAPPING - Convert domain errors to pkgs/errors.AppError
// =============================================================================

func mapDomainError(err error) error {
	switch {
	// Validation errors -> 400
	case errors.Is(err, domain.ErrTripStatusInvalid):
		return pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeInvalidTripStatus, err.Error())
	case errors.Is(err, domain.ErrTripTransitionInvalid):
		return pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeInvalidTripStatus, err.Error())
	case errors.Is(err, domain.ErrTripDepartureInPast):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrArrivalBeforeDeparture):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrTripProviderRequired):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrTripOriginRequired):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrTripDestinationRequired):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrTripPriceInvalid):
		return pkgErrors.ValidationError(err.Error())
	case errors.Is(err, domain.ErrTripCannotModify):
		return pkgErrors.Wrap(err, 400, "TRIP_CANNOT_MODIFY", err.Error())
	case errors.Is(err, domain.ErrTripCannotDelete):
		return pkgErrors.Wrap(err, 400, "TRIP_CANNOT_DELETE", err.Error())

	// Not found -> 404
	case errors.Is(err, domain.ErrTripNotFound):
		return pkgErrors.ErrTripNotFound

	// Default -> 500
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "An unexpected error occurred")
	}
}

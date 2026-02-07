package http

import (
	"errors"
	"strconv"

	"backend/internals/bustype/controller/dto"
	"backend/internals/bustype/domain"
	"backend/internals/bustype/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BusTypeHandler struct {
	uc usecase.IBusTypeUseCase
}

func NewBusTypeHandler(uc usecase.IBusTypeUseCase) *BusTypeHandler {
	return &BusTypeHandler{uc: uc}
}

func (h *BusTypeHandler) Create(c *gin.Context) {
	var req dto.CreateBusTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Create(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToBusTypeResponse(result))
}

func (h *BusTypeHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus_type"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBusTypeResponse(result))
}

func (h *BusTypeHandler) List(c *gin.Context) {
	var pg paging.Paging
	if err := c.ShouldBindQuery(&pg); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}
	pg.Process()

	items, total, err := h.uc.List(c.Request.Context(), &pg)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	responses := make([]dto.BusTypeResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToBusTypeResponse(item)
	}

	response.Success(c, paging.Of(responses, total, pg.Page))
}

func (h *BusTypeHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus_type"))
		return
	}

	var req dto.UpdateBusTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Update(c.Request.Context(), int32(id), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBusTypeResponse(result))
}

func (h *BusTypeHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus_type"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, gin.H{"message": "Bus type deleted"})
}

func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrBusTypeNotFound):
		return pkgErrors.Wrap(err, 404, "BUS_TYPE_NOT_FOUND", err.Error())
	case errors.Is(err, domain.ErrBusTypeNameRequired),
		errors.Is(err, domain.ErrBusTypeNameTooShort),
		errors.Is(err, domain.ErrBusTypeTotalSeatsRequired),
		errors.Is(err, domain.ErrBusTypeSeatLayoutRequired):
		return pkgErrors.ValidationError(err.Error())
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "An unexpected error occurred")
	}
}

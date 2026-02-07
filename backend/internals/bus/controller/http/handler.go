package http

import (
	"errors"
	"strconv"

	"backend/internals/bus/controller/dto"
	"backend/internals/bus/domain"
	"backend/internals/bus/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BusHandler struct {
	uc usecase.IBusUseCase
}

func NewBusHandler(uc usecase.IBusUseCase) *BusHandler {
	return &BusHandler{uc: uc}
}

func (h *BusHandler) Create(c *gin.Context) {
	var req dto.CreateBusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Create(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToBusResponse(result))
}

func (h *BusHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBusResponse(result))
}

func (h *BusHandler) List(c *gin.Context) {
	var pg paging.Paging
	if err := c.ShouldBindQuery(&pg); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}
	pg.Process()

	providerID := int32(0)
	if pid := c.Query("providerId"); pid != "" {
		if id, err := strconv.Atoi(pid); err == nil {
			providerID = int32(id)
		}
	}

	items, total, err := h.uc.List(c.Request.Context(), &pg, providerID)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	responses := make([]dto.BusResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToBusResponse(item)
	}

	response.Success(c, paging.Of(responses, total, pg.Page))
}

func (h *BusHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus"))
		return
	}

	var req dto.UpdateBusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Update(c.Request.Context(), int32(id), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBusResponse(result))
}

func (h *BusHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus"))
		return
	}

	var req dto.UpdateBusStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.UpdateStatus(c.Request.Context(), int32(id), req.Status)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBusResponse(result))
}

func (h *BusHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("bus"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, gin.H{"message": "Bus deleted"})
}

func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrBusNotFound):
		return pkgErrors.Wrap(err, 404, "BUS_NOT_FOUND", err.Error())
	case errors.Is(err, domain.ErrBusProviderIDRequired),
		errors.Is(err, domain.ErrBusBusTypeIDRequired),
		errors.Is(err, domain.ErrBusLicensePlateRequired),
		errors.Is(err, domain.ErrBusLicensePlateTooShort),
		errors.Is(err, domain.ErrBusStatusInvalid):
		return pkgErrors.ValidationError(err.Error())
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "An unexpected error occurred")
	}
}

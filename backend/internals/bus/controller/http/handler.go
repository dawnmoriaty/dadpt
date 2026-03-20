package http

import (
	"errors"
	"strconv"
	"strings"

	"backend/internals/bus/controller/dto"
	"backend/internals/bus/domain"
	"backend/internals/bus/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BusHandler struct {
	uc usecase.BusUseCase
}

func NewBusHandler(uc usecase.BusUseCase) *BusHandler {
	return &BusHandler{uc: uc}
}

func (h *BusHandler) Create(c *gin.Context) {
	var req dto.CreateBusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}
	pg.Process()

	providerID := int32(0)
	if pid := strings.TrimSpace(c.Query("providerId")); pid != "" {
		if id, err := strconv.Atoi(pid); err == nil {
			providerID = int32(id)
		}
	}

	filter := &domain.BusFilter{
		Limit:      int32(pg.PageSize),
		Offset:     int32(pg.Offset()),
		ProviderID: providerID,
		Query:      strings.TrimSpace(c.Query("q")),
		Status:     strings.TrimSpace(c.Query("status")),
	}

	items, total, err := h.uc.List(c.Request.Context(), filter)
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		return pkgErrors.ErrBusNotFound
	case errors.Is(err, domain.ErrBusProviderIDRequired):
		return pkgErrors.ErrBusProviderRequired
	case errors.Is(err, domain.ErrBusBusTypeIDRequired):
		return pkgErrors.ErrBusTypeRequired
	case errors.Is(err, domain.ErrBusLicensePlateRequired):
		return pkgErrors.ErrBusLicensePlateRequired
	case errors.Is(err, domain.ErrBusLicensePlateTooShort):
		return pkgErrors.ErrBusLicensePlateTooShort
	case errors.Is(err, domain.ErrBusStatusInvalid):
		return pkgErrors.ErrBusStatusInvalid
	case errors.Is(err, domain.ErrBusLicensePlateAlreadyExists):
		return pkgErrors.ErrBusLicensePlateExists
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

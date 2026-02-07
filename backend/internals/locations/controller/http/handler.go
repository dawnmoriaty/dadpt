package http

import (
	"errors"
	"strconv"

	"backend/internals/locations/controller/dto"
	"backend/internals/locations/domain"
	"backend/internals/locations/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type LocationHandler struct {
	uc usecase.ILocationUseCase
}

func NewLocationHandler(uc usecase.ILocationUseCase) *LocationHandler {
	return &LocationHandler{uc: uc}
}

func (h *LocationHandler) Create(c *gin.Context) {
	var req dto.CreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Create(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToLocationResponse(result))
}

func (h *LocationHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("location"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToLocationResponse(result))
}

func (h *LocationHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("location"))
		return
	}

	var req dto.UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Update(c.Request.Context(), int32(id), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToLocationResponse(result))
}

func (h *LocationHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("location"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, gin.H{"message": "Location deleted"})
}

func (h *LocationHandler) List(c *gin.Context) {
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

	responses := make([]dto.LocationResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToLocationResponse(item)
	}

	response.Success(c, paging.Of(responses, total, pg.Page))
}

func (h *LocationHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.HandleError(c, pkgErrors.RequiredField("search query"))
		return
	}

	items, err := h.uc.Search(c.Request.Context(), query)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	responses := make([]dto.LocationResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToLocationResponse(item)
	}

	response.Success(c, responses)
}

func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrLocationNotFound):
		return pkgErrors.Wrap(err, 404, "LOCATION_NOT_FOUND", err.Error())
	case errors.Is(err, domain.ErrLocationNameRequired),
		errors.Is(err, domain.ErrLocationNameTooShort),
		errors.Is(err, domain.ErrLocationCityRequired),
		errors.Is(err, domain.ErrLocationCityTooShort):
		return pkgErrors.ValidationError(err.Error())
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "An unexpected error occurred")
	}
}

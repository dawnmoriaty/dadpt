package http

import (
	"errors"
	"strconv"

	"backend/internals/location/controller/dto"
	"backend/internals/location/domain"
	"backend/internals/location/usecase"
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		return pkgErrors.ErrLocationNotFound
	case errors.Is(err, domain.ErrLocationNameRequired):
		return pkgErrors.ErrLocationNameRequired
	case errors.Is(err, domain.ErrLocationNameTooShort):
		return pkgErrors.ErrLocationNameTooShort
	case errors.Is(err, domain.ErrLocationCityRequired):
		return pkgErrors.ErrLocationCityRequired
	case errors.Is(err, domain.ErrLocationCityTooShort):
		return pkgErrors.ErrLocationCityTooShort
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

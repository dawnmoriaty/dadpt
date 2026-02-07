package http

import (
	"errors"
	"strconv"

	"backend/internals/providers/controller/dto"
	"backend/internals/providers/domain"
	"backend/internals/providers/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type ProviderHandler struct {
	uc usecase.IProviderUseCase
}

func NewProviderHandler(uc usecase.IProviderUseCase) *ProviderHandler {
	return &ProviderHandler{uc: uc}
}

func (h *ProviderHandler) Create(c *gin.Context) {
	var req dto.CreateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Create(c.Request.Context(), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToProviderResponse(result))
}

func (h *ProviderHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("provider"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToProviderResponse(result))
}

func (h *ProviderHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("provider"))
		return
	}

	var req dto.UpdateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Update(c.Request.Context(), int32(id), req.ToInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToProviderResponse(result))
}

func (h *ProviderHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("provider"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, gin.H{"message": "Provider deleted"})
}

func (h *ProviderHandler) List(c *gin.Context) {
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

	responses := make([]dto.ProviderResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToProviderResponse(item)
	}

	response.Success(c, paging.Of(responses, total, pg.Page))
}

func (h *ProviderHandler) ListActive(c *gin.Context) {
	items, err := h.uc.ListActive(c.Request.Context())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	responses := make([]dto.ProviderResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToProviderResponse(item)
	}

	response.Success(c, responses)
}

func (h *ProviderHandler) ToggleActive(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, pkgErrors.InvalidID("provider"))
		return
	}

	result, err := h.uc.ToggleActive(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToProviderResponse(result))
}

func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrProviderNotFound):
		return pkgErrors.Wrap(err, 404, "PROVIDER_NOT_FOUND", err.Error())
	case errors.Is(err, domain.ErrDuplicateSlug):
		return pkgErrors.Wrap(err, 409, "DUPLICATE_SLUG", err.Error())
	case errors.Is(err, domain.ErrProviderNameRequired),
		errors.Is(err, domain.ErrProviderNameTooShort),
		errors.Is(err, domain.ErrProviderHotlineInvalid),
		errors.Is(err, domain.ErrProviderSlugInvalid),
		errors.Is(err, domain.ErrProviderSlugTooShort),
		errors.Is(err, domain.ErrProviderSlugTooLong):
		return pkgErrors.ValidationError(err.Error())
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "An unexpected error occurred")
	}
}

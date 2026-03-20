package http

import (
	"errors"
	"strconv"
	"strings"

	"backend/internals/provider/controller/dto"
	"backend/internals/provider/domain"
	"backend/internals/provider/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type ProviderHandler struct {
	uc usecase.ProviderUseCase
}

func NewProviderHandler(uc usecase.ProviderUseCase) *ProviderHandler {
	return &ProviderHandler{uc: uc}
}

func (h *ProviderHandler) Create(c *gin.Context) {
	var req dto.CreateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
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
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}
	pg.Process()

	filter := &domain.ProviderFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
		Query:  strings.TrimSpace(c.Query("q")),
	}

	if active := strings.TrimSpace(c.Query("isActive")); active != "" {
		if v, parseErr := strconv.ParseBool(active); parseErr == nil {
			filter.IsActive = &v
		}
	}

	items, total, err := h.uc.List(c.Request.Context(), filter)
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
		return pkgErrors.ErrProviderNotFound
	case errors.Is(err, domain.ErrDuplicateSlug):
		return pkgErrors.ErrDuplicateSlug
	case errors.Is(err, domain.ErrProviderCannotDelete):
		return pkgErrors.ErrProviderCannotDelete
	case errors.Is(err, domain.ErrProviderNameRequired):
		return pkgErrors.ErrProviderNameRequired
	case errors.Is(err, domain.ErrProviderNameTooShort):
		return pkgErrors.ErrProviderNameTooShort
	case errors.Is(err, domain.ErrProviderHotlineInvalid):
		return pkgErrors.ErrProviderHotlineInvalid
	case errors.Is(err, domain.ErrProviderSlugInvalid):
		return pkgErrors.ErrProviderSlugInvalid
	case errors.Is(err, domain.ErrProviderSlugTooShort):
		return pkgErrors.ErrProviderSlugTooShort
	case errors.Is(err, domain.ErrProviderSlugTooLong):
		return pkgErrors.ErrProviderSlugTooLong
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

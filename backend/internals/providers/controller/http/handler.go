package http

import (
	"strconv"

	"backend/internals/providers/controller/dto"
	"backend/internals/providers/usecase"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type ProviderHandler struct {
	uc *usecase.ProviderUseCase
}

func NewProviderHandler(uc *usecase.ProviderUseCase) *ProviderHandler {
	return &ProviderHandler{uc: uc}
}

func (h *ProviderHandler) Create(c *gin.Context) {
	var req dto.CreateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Created(c, result)
}

func (h *ProviderHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("provider"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *ProviderHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("provider"))
		return
	}

	var req dto.UpdateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.Update(c.Request.Context(), int32(id), &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *ProviderHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("provider"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Provider deleted"})
}

func (h *ProviderHandler) List(c *gin.Context) {
	var pg paging.Paging
	if err := c.ShouldBindQuery(&pg); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}
	pg.Process()

	result, err := h.uc.List(c.Request.Context(), &pg)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *ProviderHandler) ListActive(c *gin.Context) {
	result, err := h.uc.ListActive(c.Request.Context())
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *ProviderHandler) ToggleActive(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("provider"))
		return
	}

	result, err := h.uc.ToggleActive(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

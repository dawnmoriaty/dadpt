package http

import (
	"strconv"

	"backend/internals/locations/controller/dto"
	"backend/internals/locations/usecase"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type LocationHandler struct {
	uc *usecase.LocationUseCase
}

func NewLocationHandler(uc *usecase.LocationUseCase) *LocationHandler {
	return &LocationHandler{uc: uc}
}

func (h *LocationHandler) Create(c *gin.Context) {
	var req dto.CreateLocationRequest
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

func (h *LocationHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("location"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *LocationHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("location"))
		return
	}

	var req dto.UpdateLocationRequest
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

func (h *LocationHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("location"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Location deleted"})
}

func (h *LocationHandler) List(c *gin.Context) {
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

func (h *LocationHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.HandleError(c, errors.RequiredField("search query"))
		return
	}

	result, err := h.uc.Search(c.Request.Context(), query)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

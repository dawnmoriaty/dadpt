package http

import (
	"strconv"

	"backend/internals/bustype/controller/dto"
	"backend/internals/bustype/usecase"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BusTypeHandler struct {
	uc *usecase.BusTypeUseCase
}

func NewBusTypeHandler(uc *usecase.BusTypeUseCase) *BusTypeHandler {
	return &BusTypeHandler{uc: uc}
}

func (h *BusTypeHandler) Create(c *gin.Context) {
	var req dto.CreateBusTypeRequest
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

func (h *BusTypeHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus_type"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *BusTypeHandler) List(c *gin.Context) {
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

func (h *BusTypeHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus_type"))
		return
	}

	var req dto.UpdateBusTypeRequest
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

func (h *BusTypeHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus_type"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Bus type deleted"})
}

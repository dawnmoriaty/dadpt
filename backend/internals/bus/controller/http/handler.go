package http

import (
	"strconv"

	"backend/internals/bus/controller/dto"
	"backend/internals/bus/usecase"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BusHandler struct {
	uc *usecase.BusUseCase
}

func NewBusHandler(uc *usecase.BusUseCase) *BusHandler {
	return &BusHandler{uc: uc}
}

func (h *BusHandler) Create(c *gin.Context) {
	var req dto.CreateBusRequest
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

func (h *BusHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus"))
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *BusHandler) List(c *gin.Context) {
	var pg paging.Paging
	if err := c.ShouldBindQuery(&pg); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}
	pg.Process()

	providerID := int32(0)
	if pid := c.Query("providerId"); pid != "" {
		if id, err := strconv.Atoi(pid); err == nil {
			providerID = int32(id)
		}
	}

	result, err := h.uc.List(c.Request.Context(), &pg, providerID)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *BusHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus"))
		return
	}

	var req dto.UpdateBusRequest
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

func (h *BusHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus"))
		return
	}

	var req dto.UpdateBusStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}

	result, err := h.uc.UpdateStatus(c.Request.Context(), int32(id), req.Status)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *BusHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.HandleError(c, errors.InvalidID("bus"))
		return
	}

	if err := h.uc.Delete(c.Request.Context(), int32(id)); err != nil {
		response.HandleError(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Bus deleted"})
}

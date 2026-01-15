package http

import (
	"backend/internals/trip/controller/dto"
	"backend/internals/trip/usecase"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type TripHandler struct {
	usecase usecase.ITripUseCase
}

func NewTripHandler(usecase usecase.ITripUseCase) *TripHandler {
	return &TripHandler{usecase: usecase}
}

// @Summary     Search trips
// @Tags        Trips
// @Produce     json
// @Param       request query dto.SearchTripsRequest true "Search params"
// @Success     200 {object} response.Response
// @Router      /trips [get]
func (h *TripHandler) SearchTrips(c *gin.Context) {
	var req dto.SearchTripsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	req.Paging.Process()

	result, err := h.usecase.SearchTrips(c.Request.Context(), &req)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// @Summary     Get trip by ID
// @Tags        Trips
// @Produce     json
// @Param       id path int true "Trip ID"
// @Success     200 {object} response.Response
// @Router      /trips/{id} [get]
func (h *TripHandler) GetTripByID(c *gin.Context) {
	id := c.Param("id")

	result, err := h.usecase.GetTripByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Trip not found")
		return
	}

	response.Success(c, result)
}

// @Summary     Create trip
// @Tags        Trips
// @Accept      json
// @Produce     json
// @Param       request body dto.CreateTripRequest true "Trip data"
// @Success     201 {object} response.Response
// @Router      /trips [post]
// @Security    ApiKeyAuth
func (h *TripHandler) CreateTrip(c *gin.Context) {
	var req dto.CreateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.usecase.CreateTrip(c.Request.Context(), &req)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, result)
}

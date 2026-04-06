package http

import (
	"backend/db"
	"backend/internals/trip/repository"
	"backend/internals/trip/usecase"

	"github.com/gin-gonic/gin"
)

func Routes(public *gin.RouterGroup, admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewTripRepository(database)

	uc := usecase.NewTripUseCase(repo)

	handler := NewTripHandler(uc)

	trips := public.Group("/trips")
	{
		trips.GET("", handler.Search)
		trips.GET("/browse", handler.Browse)
		trips.GET("/:id", handler.GetByID)
	}

	adminTrips := admin.Group("/trips")
	{
		adminTrips.POST("", handler.Create)
		adminTrips.GET("", handler.List)
		adminTrips.PUT("/:id", handler.Update)
		adminTrips.PATCH("/:id/status", handler.UpdateStatus)
		adminTrips.DELETE("/:id", handler.Delete)
	}
}

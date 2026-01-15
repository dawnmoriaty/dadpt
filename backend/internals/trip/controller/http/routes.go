package http

import (
	"backend/db"
	"backend/internals/trip/repository"
	"backend/internals/trip/usecase"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

func Routes(r *gin.RouterGroup, database *db.Database, cache redis.IRedis) {
	repo := repository.NewTripRepository(database)
	uc := usecase.NewTripUseCase(repo, cache)
	handler := NewTripHandler(uc)

	trips := r.Group("/trips")
	{
		trips.GET("", handler.SearchTrips)
		trips.GET("/:id", handler.GetTripByID)
		trips.POST("", handler.CreateTrip)
	}
}

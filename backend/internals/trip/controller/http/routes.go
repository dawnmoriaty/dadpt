package http

import (
	"backend/db"
	"backend/internals/trip/repository"
	"backend/internals/trip/usecase"

	"github.com/gin-gonic/gin"
)

// Routes registers trip routes following Hexagonal Architecture
// Dependencies are injected from outside (Dependency Inversion)
func Routes(public *gin.RouterGroup, admin *gin.RouterGroup, database *db.Database) {
	// Infrastructure layer - adapters
	repo := repository.NewTripRepository(database)

	// Application layer - use case with all dependencies injected
	uc := usecase.NewTripUseCase(repo)

	// Interface layer - HTTP handler
	handler := NewTripHandler(uc)

	// Public routes
	trips := public.Group("/trips")
	{
		trips.GET("", handler.Search)
		trips.GET("/:id", handler.GetByID)
	}

	// Admin routes
	adminTrips := admin.Group("/trips")
	{
		adminTrips.POST("", handler.Create)
		adminTrips.GET("", handler.List)
		adminTrips.PUT("/:id", handler.Update)
		adminTrips.PATCH("/:id/status", handler.UpdateStatus)
		adminTrips.DELETE("/:id", handler.Delete)
	}
}

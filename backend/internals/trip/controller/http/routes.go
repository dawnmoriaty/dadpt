package http

import (
	"backend/db"
	"backend/internals/trip/repository"
	"backend/internals/trip/usecase"

	"github.com/gin-gonic/gin"
)

func Routes(r *gin.RouterGroup, database *db.Database) {
	repo := repository.NewTripRepository(database)
	uc := usecase.NewTripUseCase(repo)
	handler := NewTripHandler(uc)

	// Public routes
	trips := r.Group("/trips")
	{
		trips.GET("", handler.Search)
		trips.GET("/:id", handler.GetByID)
	}

	// Admin routes
	admin := r.Group("/admin/trips")
	{
		admin.POST("", handler.Create)
		admin.GET("", handler.List)
		admin.PUT("/:id", handler.Update)
		admin.PATCH("/:id/status", handler.UpdateStatus)
		admin.DELETE("/:id", handler.Delete)
	}
}

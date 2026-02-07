package http

import (
	"backend/db"
	"backend/internals/providers/repository"
	"backend/internals/providers/usecase"

	"github.com/gin-gonic/gin"
)

// Routes registers provider routes following Hexagonal Architecture
func Routes(public *gin.RouterGroup, admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewProviderRepository(database)
	uc := usecase.NewProviderUseCase(repo)
	handler := NewProviderHandler(uc)

	// Public routes
	providers := public.Group("/providers")
	{
		providers.GET("", handler.ListActive)
	}

	// Admin routes
	adminProviders := admin.Group("/providers")
	{
		adminProviders.POST("", handler.Create)
		adminProviders.GET("", handler.List)
		adminProviders.GET("/:id", handler.GetByID)
		adminProviders.PUT("/:id", handler.Update)
		adminProviders.PATCH("/:id/toggle", handler.ToggleActive)
		adminProviders.DELETE("/:id", handler.Delete)
	}
}

package http

import (
	"backend/db"
	"backend/internals/provider/repository"
	"backend/internals/provider/usecase"

	"github.com/gin-gonic/gin"
)

func Routes(public *gin.RouterGroup, admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewProviderRepository(database)
	uc := usecase.NewProviderUseCase(repo)
	handler := NewProviderHandler(uc)

	providers := public.Group("/providers")
	{
		providers.GET("", handler.ListActive)
	}

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

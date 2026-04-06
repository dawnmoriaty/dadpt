package http

import (
	"backend/db"
	"backend/internals/location/repository"
	"backend/internals/location/usecase"

	"github.com/gin-gonic/gin"
)

func Routes(public *gin.RouterGroup, admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewLocationRepository(database)
	uc := usecase.NewLocationUseCase(repo)
	handler := NewLocationHandler(uc)

	locations := public.Group("/locations")
	{
		locations.GET("/search", handler.Search)
	}

	adminLocations := admin.Group("/locations")
	{
		adminLocations.POST("", handler.Create)
		adminLocations.GET("", handler.List)
		adminLocations.GET("/:id", handler.GetByID)
		adminLocations.PUT("/:id", handler.Update)
		adminLocations.DELETE("/:id", handler.Delete)
	}
}

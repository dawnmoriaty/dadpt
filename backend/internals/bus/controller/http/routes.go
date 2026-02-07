package http

import (
	"backend/db"
	"backend/internals/bus/repository"
	"backend/internals/bus/usecase"

	"github.com/gin-gonic/gin"
)

// Routes registers bus routes following Hexagonal Architecture
func Routes(admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewBusRepository(database)
	uc := usecase.NewBusUseCase(repo)
	handler := NewBusHandler(uc)

	buses := admin.Group("/buses")
	{
		buses.POST("", handler.Create)
		buses.GET("", handler.List)
		buses.GET("/:id", handler.GetByID)
		buses.PUT("/:id", handler.Update)
		buses.PATCH("/:id/status", handler.UpdateStatus)
		buses.DELETE("/:id", handler.Delete)
	}
}

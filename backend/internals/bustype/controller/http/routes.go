package http

import (
	"backend/db"
	"backend/internals/bustype/repository"
	"backend/internals/bustype/usecase"

	"github.com/gin-gonic/gin"
)

// Routes registers bus type routes following Hexagonal Architecture
func Routes(admin *gin.RouterGroup, database *db.Database) {
	repo := repository.NewBusTypeRepository(database)
	uc := usecase.NewBusTypeUseCase(repo)
	handler := NewBusTypeHandler(uc)

	busTypes := admin.Group("/bus-types")
	{
		busTypes.POST("", handler.Create)
		busTypes.GET("", handler.List)
		busTypes.GET("/:id", handler.GetByID)
		busTypes.PUT("/:id", handler.Update)
		busTypes.DELETE("/:id", handler.Delete)
	}
}

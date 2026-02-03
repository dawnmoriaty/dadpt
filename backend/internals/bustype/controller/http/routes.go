package http

import "github.com/gin-gonic/gin"

func RegisterRoutes(rg *gin.RouterGroup, handler *BusTypeHandler) {
	busTypes := rg.Group("/bus-types")
	{
		busTypes.POST("", handler.Create)
		busTypes.GET("", handler.List)
		busTypes.GET("/:id", handler.GetByID)
		busTypes.PUT("/:id", handler.Update)
		busTypes.DELETE("/:id", handler.Delete)
	}
}

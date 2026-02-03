package http

import "github.com/gin-gonic/gin"

func RegisterRoutes(rg *gin.RouterGroup, handler *BusHandler) {
	buses := rg.Group("/buses")
	{
		buses.POST("", handler.Create)
		buses.GET("", handler.List)
		buses.GET("/:id", handler.GetByID)
		buses.PUT("/:id", handler.Update)
		buses.PATCH("/:id/status", handler.UpdateStatus)
		buses.DELETE("/:id", handler.Delete)
	}
}

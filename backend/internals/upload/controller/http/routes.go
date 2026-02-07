package http

import "github.com/gin-gonic/gin"

// RegisterRoutes registers admin upload routes (behind auth + role middleware).
func RegisterRoutes(rg *gin.RouterGroup, handler *UploadHandler) {
	rg.POST("/upload", handler.UploadImage)
	rg.DELETE("/upload", handler.DeleteImage)
}

// RegisterPublicRoutes registers the public file proxy route (no auth required).
func RegisterPublicRoutes(rg *gin.RouterGroup, handler *UploadHandler) {
	rg.GET("/files/*filepath", handler.ServeFile)
}

package http

import "github.com/gin-gonic/gin"

func RegisterRoutes(rg *gin.RouterGroup, handler *UploadHandler) {
	rg.POST("/upload", handler.UploadImage)
	rg.DELETE("/upload", handler.DeleteImage)
}

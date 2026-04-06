package http

import (
	"io"
	"net/http"
	"strconv"

	"backend/pkgs/errors"
	"backend/pkgs/logger"
	"backend/pkgs/minio"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	minioClient *minio.MinioClient
}

func NewUploadHandler(minioClient *minio.MinioClient) *UploadHandler {
	return &UploadHandler{minioClient: minioClient}
}

func (h *UploadHandler) ServeFile(c *gin.Context) {
	if h.minioClient == nil {
		response.HandleError(c, errors.ErrUploadUnavailable)
		return
	}

	objectName := c.Param("filepath")
	if objectName == "" || objectName == "/" {
		response.HandleError(c, errors.ValidationError(errors.ErrCodeRequiredField))
		return
	}
	if objectName[0] == '/' {
		objectName = objectName[1:]
	}

	reader, contentType, size, err := h.minioClient.GetObject(c.Request.Context(), objectName)
	if err != nil {
		response.HandleError(c, errors.ErrNotFound)
		return
	}
	defer reader.Close()

	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.FormatInt(size, 10))

	c.Header("Cache-Control", "public, max-age=31536000, immutable")

	c.Header("ETag", `"`+objectName+`"`)


	c.Status(http.StatusOK)

	if _, err := io.Copy(c.Writer, reader); err != nil {
		logger.Warn("serve file stream interrupted: %v", err)
	}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	if h.minioClient == nil {
		response.HandleError(c, errors.ErrUploadUnavailable)
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.HandleError(c, errors.ValidationError(errors.ErrCodeRequiredField))
		return
	}

	contentType := file.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		response.HandleError(c, errors.ErrInvalidFile)
		return
	}

	folder := c.PostForm("folder")
	if folder == "" {
		folder = "uploads"
	}

	url, err := h.minioClient.UploadFile(c.Request.Context(), file, folder)
	if err != nil {
		response.HandleError(c, errors.Wrap(err, 500, errors.ErrCodeUploadFailed))
		return
	}

	response.Success(c, gin.H{
		"url":      url,
		"filename": file.Filename,
		"size":     file.Size,
	})
}

func (h *UploadHandler) DeleteImage(c *gin.Context) {
	if h.minioClient == nil {
		response.HandleError(c, errors.ErrUploadUnavailable)
		return
	}

	fileURL := c.Query("url")
	if fileURL == "" {
		response.HandleError(c, errors.ValidationError(errors.ErrCodeRequiredField))
		return
	}

	if err := h.minioClient.DeleteFile(c.Request.Context(), fileURL); err != nil {
		response.HandleError(c, errors.Wrap(err, 500, errors.ErrCodeDeleteFailed))
		return
	}

	response.Success(c, gin.H{"message": "File deleted"})
}

func isValidImageType(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}

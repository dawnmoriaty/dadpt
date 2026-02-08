package http

import (
	"fmt"
	"io"
	"strconv"

	"backend/pkgs/errors"
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

// ServeFile proxies a MinIO object to the browser with proper cache headers.
// GET /api/v1/files/*filepath
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
	// Strip leading slash from wildcard param
	if objectName[0] == '/' {
		objectName = objectName[1:]
	}

	reader, contentType, size, err := h.minioClient.GetObject(c.Request.Context(), objectName)
	if err != nil {
		response.HandleError(c, errors.ErrNotFound)
		return
	}
	defer reader.Close()

	// Immutable cache — object names contain timestamps
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.FormatInt(size, 10))

	if _, err := io.Copy(c.Writer, reader); err != nil {
		// Client probably disconnected, just log
		fmt.Printf("serve file stream error: %v\n", err)
	}
}

// UploadImage handles file upload to MinIO
// POST /admin/upload
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

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		response.HandleError(c, errors.ErrInvalidFile)
		return
	}

	// Get folder from form or use default
	folder := c.PostForm("folder")
	if folder == "" {
		folder = "uploads"
	}

	// Upload to MinIO
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

// DeleteImage removes a file from MinIO
// DELETE /admin/upload?url=<file_url>
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
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	return validTypes[contentType]
}

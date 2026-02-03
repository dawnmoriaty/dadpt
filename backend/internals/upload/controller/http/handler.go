package http

import (
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

// UploadImage handles file upload to MinIO
// POST /admin/upload
// Form fields: file (required), folder (optional, default: "uploads")
func (h *UploadHandler) UploadImage(c *gin.Context) {
	if h.minioClient == nil {
		response.HandleError(c, errors.NewAppError(500, errors.ErrCodeInternal, "Upload service not available"))
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.HandleError(c, errors.ValidationError("File is required"))
		return
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		response.HandleError(c, errors.ValidationError("Only image files are allowed (jpeg, png, gif, webp)"))
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
		response.HandleError(c, errors.Wrap(err, 500, errors.ErrCodeInternal, "Failed to upload file"))
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
		response.HandleError(c, errors.NewAppError(500, errors.ErrCodeInternal, "Upload service not available"))
		return
	}

	fileURL := c.Query("url")
	if fileURL == "" {
		response.HandleError(c, errors.ValidationError("URL is required"))
		return
	}

	if err := h.minioClient.DeleteFile(c.Request.Context(), fileURL); err != nil {
		response.HandleError(c, errors.Wrap(err, 500, errors.ErrCodeInternal, "Failed to delete file"))
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

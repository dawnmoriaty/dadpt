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

// ServeFile proxies a MinIO object to the browser with proper cache +
// ETag headers. Object names contain timestamps → immutable cache is safe.
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

	// -- Response headers --
	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.FormatInt(size, 10))

	// Immutable cache — object names embed nanosecond timestamps so they
	// never collide. 1 year + immutable lets browsers & CDNs cache forever.
	c.Header("Cache-Control", "public, max-age=31536000, immutable")

	// ETag from object name — cheap but unique enough for cache validation.
	c.Header("ETag", `"`+objectName+`"`)

	// Accept-Ranges not needed — we always stream the full object.
	// Content-Disposition is omitted so images render inline by default.

	c.Status(http.StatusOK)

	if _, err := io.Copy(c.Writer, reader); err != nil {
		// Client probably disconnected mid-stream; just log, don't error.
		logger.Warn("serve file stream interrupted: %v", err)
	}
}

// UploadImage handles file upload to MinIO.
// POST /admin/upload   form-data: file + folder
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

	// Validate MIME type
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

// DeleteImage removes a file from MinIO.
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
	switch contentType {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}

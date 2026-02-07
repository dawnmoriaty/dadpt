package minio

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"time"

	"backend/pkgs/logger"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type IUploadService interface {
	UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error)
	DeleteFile(ctx context.Context, fileURL string) error
	GetObject(ctx context.Context, objectName string) (io.ReadCloser, string, int64, error)
}

type MinioClient struct {
	Client       *minio.Client
	Bucket       string
	BaseURL      string
	ProxyBaseURL string // e.g. "/api/v1/files"
}

func NewMinioClient(endpoint, accessKey, secretKey, bucket, baseURL string, useSSL bool) (*MinioClient, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, err
	}

	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
		logger.Info("MinIO bucket created: %s", bucket)
	}

	logger.Info("MinIO connection established")

	return &MinioClient{
		Client:       client,
		Bucket:       bucket,
		BaseURL:      baseURL,
		ProxyBaseURL: "/api/v1/files",
	}, nil
}

// UploadFile uploads a file to MinIO and returns a proxy-safe URL path.
// The returned URL is relative: /api/v1/files/<objectName>
func (m *MinioClient) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	if folder == "" {
		folder = "uploads"
	}

	objectName := fmt.Sprintf("%s/%d-%s", folder, time.Now().UnixNano(), file.Filename)

	_, err = m.Client.PutObject(ctx, m.Bucket, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", err
	}

	// Return proxy URL instead of direct MinIO URL
	return fmt.Sprintf("%s/%s", m.ProxyBaseURL, objectName), nil
}

// GetObject retrieves an object from MinIO, returning the reader, content-type, size and error.
func (m *MinioClient) GetObject(ctx context.Context, objectName string) (io.ReadCloser, string, int64, error) {
	obj, err := m.Client.GetObject(ctx, m.Bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", 0, err
	}

	stat, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, "", 0, err
	}

	return obj, stat.ContentType, stat.Size, nil
}

func (m *MinioClient) DeleteFile(ctx context.Context, fileURL string) error {
	objectName := extractObjectName(fileURL, m.ProxyBaseURL, m.BaseURL, m.Bucket)
	return m.Client.RemoveObject(ctx, m.Bucket, objectName, minio.RemoveObjectOptions{})
}

// extractObjectName handles both proxy URLs (/api/v1/files/...) and legacy MinIO URLs (http://localhost:9000/bucket/...)
func extractObjectName(fileURL, proxyBase, baseURL, bucket string) string {
	// Try proxy URL format first
	if strings.HasPrefix(fileURL, proxyBase+"/") {
		return strings.TrimPrefix(fileURL, proxyBase+"/")
	}
	// Legacy direct MinIO URL
	return strings.TrimPrefix(fileURL, fmt.Sprintf("%s/%s/", baseURL, bucket))
}

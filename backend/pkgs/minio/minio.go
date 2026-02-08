package minio

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"backend/pkgs/logger"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var publicReadPrefixes = []string{
	"buses",
	"providers",
	"avatars",
	"uploads",
}
var (
	reUnsafe    = regexp.MustCompile(`[^a-z0-9.\-]+`)
	reMultiDash = regexp.MustCompile(`-{2,}`)
)

func sanitizeFilename(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	base := strings.TrimSuffix(name, filepath.Ext(name))
	base = strings.ToLower(base)
	base = reUnsafe.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	base = reMultiDash.ReplaceAllString(base, "-")
	if base == "" {
		base = "file"
	}
	return base + ext
}

// ---------------------------------------------------------------------------
// MinioClient — the only struct exported from this package.
// ---------------------------------------------------------------------------

// MinioClient wraps the minio SDK and owns bucket + URL config.
type MinioClient struct {
	client       *minio.Client
	bucket       string
	baseURL      string // direct MinIO URL (legacy compat)
	proxyBaseURL string // backend proxy path, e.g. "/api/v1/files"
}

func NewMinioClient(endpoint, accessKey, secretKey, bucket, baseURL string, useSSL bool) (*MinioClient, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio connect: %w", err)
	}

	ctx := context.Background()

	// 1) Ensure bucket
	if err := ensureBucket(ctx, client, bucket); err != nil {
		return nil, err
	}

	// 2) Ensure scoped public-read policy (idempotent — skips if unchanged)
	if err := ensurePublicReadPolicy(ctx, client, bucket); err != nil {
		// Non-fatal: the proxy path still works, only direct MinIO URLs break.
		logger.Warn("MinIO: could not apply public-read policy on %s: %v", bucket, err)
	}

	logger.Info("MinIO connection established (bucket=%s)", bucket)

	return &MinioClient{
		client:       client,
		bucket:       bucket,
		baseURL:      baseURL,
		proxyBaseURL: "/api/v1/files",
	}, nil
}

// ---------------------------------------------------------------------------
// Upload / Get / Delete
// ---------------------------------------------------------------------------

// UploadFile stores a multipart file and returns a proxy-safe relative URL.
// Returned path: /api/v1/files/<folder>/<timestamp>-<safe-name>
func (m *MinioClient) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("open upload: %w", err)
	}
	defer src.Close()

	if folder == "" {
		folder = "uploads"
	}

	safeName := sanitizeFilename(file.Filename)
	objectName := fmt.Sprintf("%s/%d-%s", folder, time.Now().UnixNano(), safeName)

	_, err = m.client.PutObject(ctx, m.bucket, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", fmt.Errorf("put object: %w", err)
	}

	return fmt.Sprintf("%s/%s", m.proxyBaseURL, objectName), nil
}

// GetObject retrieves an object from MinIO.
// Caller MUST close the returned ReadCloser.
func (m *MinioClient) GetObject(ctx context.Context, objectName string) (io.ReadCloser, string, int64, error) {
	obj, err := m.client.GetObject(ctx, m.bucket, objectName, minio.GetObjectOptions{})
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
	objectName := m.extractObjectName(fileURL)
	return m.client.RemoveObject(ctx, m.bucket, objectName, minio.RemoveObjectOptions{})
}
func (m *MinioClient) extractObjectName(fileURL string) string {
	if strings.HasPrefix(fileURL, m.proxyBaseURL+"/") {
		return strings.TrimPrefix(fileURL, m.proxyBaseURL+"/")
	}
	return strings.TrimPrefix(fileURL, fmt.Sprintf("%s/%s/", m.baseURL, m.bucket))
}
func ensureBucket(ctx context.Context, client *minio.Client, bucket string) error {
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("create bucket: %w", err)
		}
		logger.Info("MinIO bucket created: %s", bucket)
	}
	return nil
}

func ensurePublicReadPolicy(ctx context.Context, client *minio.Client, bucket string) error {
	desired := buildPublicReadPolicy(bucket)
	desiredJSON, err := json.Marshal(desired)
	if err != nil {
		return fmt.Errorf("marshal policy: %w", err)
	}

	// Compare with current policy — skip SetBucketPolicy if identical.
	current, err := client.GetBucketPolicy(ctx, bucket)
	if err == nil && current == string(desiredJSON) {
		return nil // already up-to-date
	}

	if err := client.SetBucketPolicy(ctx, bucket, string(desiredJSON)); err != nil {
		return fmt.Errorf("set policy: %w", err)
	}
	logger.Info("MinIO: public-read policy applied on bucket %s for prefixes %v", bucket, publicReadPrefixes)
	return nil
}

// buildPublicReadPolicy generates an S3 bucket policy that grants anonymous
// s3:GetObject **only** on the listed folder prefixes.
//
//	{
//	  "Version": "2012-10-17",
//	  "Statement": [
//	    {
//	      "Effect": "Allow",
//	      "Principal": "*",
//	      "Action": ["s3:GetObject"],
//	      "Resource": [
//	        "arn:aws:s3:::bus-ticketing/buses/*",
//	        "arn:aws:s3:::bus-ticketing/providers/*",
//	        ...
//	      ]
//	    }
//	  ]
//	}
func buildPublicReadPolicy(bucket string) map[string]interface{} {
	resources := make([]string, len(publicReadPrefixes))
	for i, prefix := range publicReadPrefixes {
		resources[i] = fmt.Sprintf("arn:aws:s3:::%s/%s/*", bucket, prefix)
	}

	return map[string]interface{}{
		"Version": "2012-10-17",
		"Statement": []map[string]interface{}{
			{
				"Effect":    "Allow",
				"Principal": "*",
				"Action":    []string{"s3:GetObject"},
				"Resource":  resources,
			},
		},
	}
}

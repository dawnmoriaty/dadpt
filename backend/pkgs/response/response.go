package response

import (
	"backend/pkgs/errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    http.StatusOK,
		Status:  "success",
		Message: "Success",
		Data:    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Code:    http.StatusCreated,
		Status:  "success",
		Message: "Created",
		Data:    data,
	})
}

func HandleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		c.JSON(appErr.Status, Response{
			Code:    appErr.Status,
			Status:  string(appErr.Code),
			Message: appErr.Message,
		})
		return
	}

	// Fallback for unknown errors
	c.JSON(http.StatusInternalServerError, Response{
		Code:    http.StatusInternalServerError,
		Status:  string(errors.ErrCodeInternal),
		Message: err.Error(),
	})
}

func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, Response{
		Code:    http.StatusBadRequest,
		Status:  string(errors.ErrCodeBadRequest),
		Message: message,
	})
}

func Unauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, Response{
		Code:    http.StatusUnauthorized,
		Status:  string(errors.ErrCodeUnauthorized),
		Message: message,
	})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, Response{
		Code:    http.StatusNotFound,
		Status:  string(errors.ErrCodeNotFound),
		Message: message,
	})
}

func InternalServerError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, Response{
		Code:    http.StatusInternalServerError,
		Status:  string(errors.ErrCodeInternal),
		Message: message,
	})
}

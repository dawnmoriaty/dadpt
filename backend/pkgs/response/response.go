package response

import (
	"backend/pkgs/errors"
	"backend/pkgs/i18n"
	"backend/pkgs/logger"
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
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))

	if appErr, ok := err.(*errors.AppError); ok {
		if appErr.Status >= 500 || appErr.Raw != nil {
			logger.LogAppError(appErr)
		} else {
			logger.ErrorWithCaller(appErr, "Request Error")
		}

		message := i18n.T(lang, appErr.Code)

		c.JSON(appErr.Status, Response{
			Code:    appErr.Status,
			Status:  appErr.Code,
			Message: message,
		})
		return
	}

	logger.ErrorWithStack(err, "Unhandled Error")
	c.JSON(http.StatusInternalServerError, Response{
		Code:    http.StatusInternalServerError,
		Status:  errors.ErrCodeInternal,
		Message: i18n.T(lang, errors.ErrCodeInternal),
	})
}

func BadRequest(c *gin.Context, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusBadRequest, Response{
		Code:    http.StatusBadRequest,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func Unauthorized(c *gin.Context, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusUnauthorized, Response{
		Code:    http.StatusUnauthorized,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func NotFound(c *gin.Context, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusNotFound, Response{
		Code:    http.StatusNotFound,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func InternalServerError(c *gin.Context) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusInternalServerError, Response{
		Code:    http.StatusInternalServerError,
		Status:  errors.ErrCodeInternal,
		Message: i18n.T(lang, errors.ErrCodeInternal),
	})
}

func Error(c *gin.Context, status int, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(status, Response{
		Code:    status,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func Forbidden(c *gin.Context, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusForbidden, Response{
		Code:    http.StatusForbidden,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func Conflict(c *gin.Context, code string) {
	lang := i18n.ParseLang(c.GetHeader("Accept-Language"))
	c.JSON(http.StatusConflict, Response{
		Code:    http.StatusConflict,
		Status:  code,
		Message: i18n.T(lang, code),
	})
}

func SuccessWithPagination(c *gin.Context, data interface{}, meta interface{}) {
	c.JSON(http.StatusOK, gin.H{
		"code":    http.StatusOK,
		"status":  "success",
		"message": "Success",
		"data":    data,
		"meta":    meta,
	})
}

package http

import (
	"backend/configs"
	"errors"
	"strings"

	"backend/internals/auth/controller/dto"
	"backend/internals/auth/domain"
	"backend/internals/auth/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	uc  usecase.IAuthUseCase
	cfg *configs.Config
}

func NewAuthHandler(uc usecase.IAuthUseCase, cfg *configs.Config) *AuthHandler {
	return &AuthHandler{uc: uc, cfg: cfg}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	result, err := h.uc.Register(c.Request.Context(), req.ToRegisterInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToAuthResponse(result))
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	result, err := h.uc.Login(c.Request.Context(), req.ToLoginInput())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}
	c.SetCookie("refresh_token", result.RefreshToken, int(h.cfg.RefreshTokenDuration.Seconds()), "/", "", false, true)
	response.Success(c, dto.ToAuthResponse(result))
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	if token == "" {
		response.HandleError(c, pkgErrors.ErrMissingAuthHeader)
		return
	}

	if err := h.uc.Logout(c.Request.Context(), token); err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
	response.Success(c, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	refreshToken, _ := c.Cookie("refresh_token")
	if refreshToken == "" {
		var req dto.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.HandleError(c, pkgErrors.ValidationError("refresh_token is required"))
			return
		}
		refreshToken = req.RefreshToken
	}

	result, err := h.uc.RefreshToken(c.Request.Context(), &domain.RefreshInput{
		RefreshToken: refreshToken,
	})
	if err != nil {
		c.SetCookie("refresh_token", "", -1, "/", "", false, true)
		response.HandleError(c, mapDomainError(err))
		return
	}

	c.SetCookie("refresh_token", result.RefreshToken, int(h.cfg.RefreshTokenDuration.Seconds()), "/", "", false, true)
	response.Success(c, dto.ToAuthResponse(result))
}


func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrInvalidPhone):
		return pkgErrors.ErrInvalidPhone
	case errors.Is(err, domain.ErrInvalidEmail):
		return pkgErrors.ErrInvalidEmail
	case errors.Is(err, domain.ErrInvalidFullName):
		return pkgErrors.ErrInvalidFullName
	case errors.Is(err, domain.ErrInvalidUsername):
		return pkgErrors.ErrInvalidUsername
	case errors.Is(err, domain.ErrInvalidPassword):
		return pkgErrors.ErrInvalidPassword

	case errors.Is(err, domain.ErrInvalidRole):
		return pkgErrors.ErrInvalidRole

	case errors.Is(err, domain.ErrPhoneAlreadyExists):
		return pkgErrors.ErrPhoneExists
	case errors.Is(err, domain.ErrEmailAlreadyExists):
		return pkgErrors.ErrEmailExists

	case errors.Is(err, domain.ErrInvalidCredentials):
		return pkgErrors.ErrInvalidCredentials
	case errors.Is(err, domain.ErrTokenInvalid):
		return pkgErrors.ErrInvalidToken
	case errors.Is(err, domain.ErrTokenExpired):
		return pkgErrors.ErrTokenExpired

	case errors.Is(err, domain.ErrUserInactive):
		return pkgErrors.ErrUserInactive

	case errors.Is(err, domain.ErrUserNotFound):
		return pkgErrors.ErrUserNotFound

	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

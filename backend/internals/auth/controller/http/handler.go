package http

import (
	"backend/internals/auth/controller/dto"
	"backend/internals/auth/usecase"
	"backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	usecase usecase.IAuthUseCase
}

func NewAuthHandler(usecase usecase.IAuthUseCase) *AuthHandler {
	return &AuthHandler{usecase: usecase}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}

	result, err := h.usecase.Register(c.Request.Context(), &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	response.Created(c, result)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, errors.ValidationError(err.Error()))
		return
	}

	result, err := h.usecase.Login(c.Request.Context(), &req)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	// Set Refresh Token as HttpOnly Cookie (7 days)
	c.SetCookie("refresh_token", result.RefreshToken, 7*24*3600, "/", "", false, true)

	response.Success(c, result)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		response.HandleError(c, errors.ErrMissingAuthHeader)
		return
	}
	// Strip "Bearer " prefix if present
	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	err := h.usecase.Logout(c.Request.Context(), tokenString)
	if err != nil {
		response.HandleError(c, err)
		return
	}

	// Clear Refresh Token Cookie
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)

	response.Success(c, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// 1. Try get from Cookie
	refreshToken, err := c.Cookie("refresh_token")

	// 2. Fallback to Body
	var req dto.RefreshTokenRequest
	if err != nil || refreshToken == "" {
		if errBinding := c.ShouldBindJSON(&req); errBinding != nil {
			response.HandleError(c, errors.RequiredField("refresh_token"))
			return
		}
		refreshToken = req.RefreshToken
	} else {
		// Populate req for usecase
		req.RefreshToken = refreshToken
	}

	result, err := h.usecase.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		// Clear cookie if invalid
		c.SetCookie("refresh_token", "", -1, "/", "", false, true)
		response.HandleError(c, err)
		return
	}

	// Update Cookie with new refresh token
	c.SetCookie("refresh_token", result.RefreshToken, 7*24*3600, "/", "", false, true)

	response.Success(c, result)
}

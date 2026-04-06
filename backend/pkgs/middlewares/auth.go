package middlewares

import (
	"backend/pkgs/errors"
	"backend/pkgs/jwt"
	"backend/pkgs/redis"
	"backend/pkgs/response"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtProv jwt.JWTProvider, cache redis.IRedis) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				token = parts[1]
			}
		}

		if token == "" {
			response.HandleError(c, errors.ErrMissingAuthHeader)
			c.Abort()
			return
		}

		tokenString := token

		claims, err := jwtProv.ValidateToken(tokenString)
		if err != nil {
			response.HandleError(c, errors.ErrInvalidToken)
			c.Abort()
			return
		}

		if cache != nil && cache.IsConnected() {
			blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
			var val string
			_ = cache.Get(blacklistKey, &val)
			if val == "revoked" {
				response.HandleError(c, errors.ErrInvalidToken)
				c.Abort()
				return
			}
		}

		if userID, ok := (*claims)["user_id"].(float64); ok {
			c.Set("userID", int64(userID))
		}
		if role, ok := (*claims)["role"].(string); ok {
			c.Set("role", role)
		}

		_ = tokenString // unused suppressed

		c.Set("token", token)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.HandleError(c, errors.ErrUnauthorized)
			c.Abort()
			return
		}

		userRole, ok := role.(string)
		if !ok {
			response.HandleError(c, errors.ErrUnauthorized)
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if userRole == allowed {
				c.Next()
				return
			}
		}

		response.HandleError(c, errors.ErrInsufficientRole)
		c.Abort()
	}
}

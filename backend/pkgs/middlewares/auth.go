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
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.HandleError(c, errors.ErrMissingAuthHeader)
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.HandleError(c, errors.ErrInvalidToken)
			c.Abort()
			return
		}

		token := parts[1]
		tokenString := parts[1]

		// 1. Validate Token Signature
		claims, err := jwtProv.ValidateToken(tokenString)
		if err != nil {
			response.HandleError(c, errors.ErrInvalidToken)
			c.Abort()
			return
		}

		// 2. Check Blacklist (Redis)
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

		// 3. Set User Claims to Context
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

// RoleMiddleware checks if user has required role(s)
// Usage: RoleMiddleware("admin", "operator") - allows admin OR operator
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

		// Check if user role is in allowed roles
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

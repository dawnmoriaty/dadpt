package middlewares

import (
	"backend/pkgs/jwt"
	"backend/pkgs/redis"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtProv jwt.JWTProvider, cache redis.IRedis) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		token := parts[1]
		tokenString := parts[1]

		// 1. Validate Token Signature
		claims, err := jwtProv.ValidateToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// 2. Check Blacklist (Redis)
		if cache != nil && cache.IsConnected() {
			blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
			var val string
			_ = cache.Get(blacklistKey, &val)
			if val == "revoked" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token revoked"})
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

package middlewares

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CorsMiddleware() gin.HandlerFunc {
	allowedOrigins := map[string]struct{}{
		"http://localhost:3000":    {},
		"http://localhost:5173":    {},
		"http://localhost:4200":    {},
		"http://localhost:9000":    {},
		"http://localhost:9001":    {},
		"http://localhost:8100":    {},
		"http://localhost:8081":    {},
		"http://localhost:19006":   {},
		"http://127.0.0.1:8081":    {},
		"http://127.0.0.1:19006":   {},
		"http://localhost:5672":    {},
		"http://localhost:15672":   {},
		"https://dadpt.vercel.app": {},
	}

	return cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return true
			}

			if _, ok := allowedOrigins[origin]; ok {
				return true
			}

			return strings.HasPrefix(origin, "https://") && strings.HasSuffix(origin, ".vercel.app")
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}

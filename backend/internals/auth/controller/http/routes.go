package http

import (
	"backend/configs"
	"backend/db"
	"backend/internals/auth/infrastructure"
	"backend/internals/auth/repository"
	"backend/internals/auth/usecase"
	"backend/pkgs/jwt"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

// Routes registers auth routes following Hexagonal Architecture
// Dependencies are injected from outside (Dependency Inversion)
func Routes(r *gin.RouterGroup, database *db.Database, cfg *configs.Config, cache redis.IRedis, jwtProv jwt.JWTProvider) {
	// Infrastructure layer - adapters
	repo := repository.NewAuthRepository(database)
	hasher := infrastructure.NewBcryptHasher()

	// Application layer - use case with all dependencies injected
	uc := usecase.NewAuthUseCase(repo, hasher, jwtProv, cache, cfg)

	// Interface layer - HTTP handler
	handler := NewAuthHandler(uc)

	// Register routes
	auth := r.Group("/auth")
	{
		auth.POST("/register", handler.Register)
		auth.POST("/login", handler.Login)
		auth.POST("/refresh", handler.RefreshToken)
		auth.POST("/logout", handler.Logout)
	}
}

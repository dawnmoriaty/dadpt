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

func Routes(r *gin.RouterGroup, database *db.Database, cfg *configs.Config, cache redis.IRedis, jwtProv jwt.JWTProvider) {
	repo := repository.NewAuthRepository(database)
	hasher := infrastructure.NewBcryptHasher()

	uc := usecase.NewAuthUseCase(repo, hasher, jwtProv, cache, cfg)

	handler := NewAuthHandler(uc, cfg)

	auth := r.Group("/auth")
	{
		auth.POST("/register", handler.Register)
		auth.POST("/login", handler.Login)
		auth.POST("/refresh", handler.RefreshToken)
		auth.POST("/logout", handler.Logout)
	}
}

package http

import (
	"backend/configs"
	"backend/db"
	authHttp "backend/internals/auth/controller/http"
	tripHttp "backend/internals/trip/controller/http"
	"backend/pkgs/jwt"
	"backend/pkgs/middlewares"
	"backend/pkgs/redis"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine   *gin.Engine
	cfg      *configs.Config
	database *db.Database
	cache    redis.IRedis
	jwtProv  jwt.JWTProvider
}

// NewServer is injectable by DI container
func NewServer(cfg *configs.Config, database *db.Database, cache redis.IRedis, jwtProv jwt.JWTProvider) *Server {
	return &Server{
		engine:   gin.Default(),
		cfg:      cfg,
		database: database,
		cache:    cache,
		jwtProv:  jwtProv,
	}
}

func (s *Server) Run() error {
	_ = s.engine.SetTrustedProxies(nil)

	// Disable debug logs
	gin.SetMode(gin.ReleaseMode)

	// Middlewares
	s.engine.Use(middlewares.RecoveryMiddleware())
	s.engine.Use(middlewares.LoggerMiddleware())
	s.engine.Use(middlewares.CorsMiddleware())

	// Health check
	s.engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	s.engine.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Bus Ticketing API v1.0",
		})
	})

	// Map routes
	s.MapRoutes()

	// Run server
	return s.engine.Run(fmt.Sprintf(":%d", s.cfg.HTTPPort))
}

func (s *Server) MapRoutes() {
	v1 := s.engine.Group("/api/v1")

	// Auth routes
	authHttp.Routes(v1, s.database, s.cfg, s.cache, s.jwtProv)

	// Trip routes
	tripHttp.Routes(v1, s.database, s.cache)
}

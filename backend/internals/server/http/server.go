package http

import (
	"fmt"
	"net/http"

	"backend/configs"
	"backend/db"
	aiagentHttp "backend/internals/aiagent/controller/http"
	authHttp "backend/internals/auth/controller/http"
	bookingHttp "backend/internals/booking/controller/http"
	busHttp "backend/internals/bus/controller/http"
	bustypeHttp "backend/internals/bustype/controller/http"
	locationHttp "backend/internals/location/controller/http"
	providerHttp "backend/internals/provider/controller/http"
	tripHttp "backend/internals/trip/controller/http"
	uploadHttp "backend/internals/upload/controller/http"
	"backend/pkgs/i18n"
	"backend/pkgs/jwt"
	"backend/pkgs/middlewares"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine        *gin.Engine
	cfg           *configs.Config
	db            *db.Database
	authHandler   *authHttp.AuthHandler
	chatHandler   *aiagentHttp.ChatHandler
	uploadHandler *uploadHttp.UploadHandler
	jwtProvider   jwt.JWTProvider
	cache         redis.IRedis
}

// NewServer is injectable by DI container
func NewServer(
	cfg *configs.Config,
	database *db.Database,
	authHandler *authHttp.AuthHandler,
	chatHandler *aiagentHttp.ChatHandler,
	uploadHandler *uploadHttp.UploadHandler,
	jwtProvider jwt.JWTProvider,
	cache redis.IRedis,
) *Server {
	return &Server{
		engine:        gin.Default(),
		cfg:           cfg,
		db:            database,
		authHandler:   authHandler,
		chatHandler:   chatHandler,
		uploadHandler: uploadHandler,
		jwtProvider:   jwtProvider,
		cache:         cache,
	}
}

func (s *Server) Run() error {
	_ = s.engine.SetTrustedProxies(nil)

	// Initialize i18n translator (must be called before any handler)
	i18n.Init()

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

	// Public file serving — proxy images from MinIO (no auth)
	uploadHttp.RegisterPublicRoutes(v1, s.uploadHandler)

	// Auth routes
	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", s.authHandler.Register)
		authGroup.POST("/login", s.authHandler.Login)
		authGroup.POST("/refresh", s.authHandler.RefreshToken)
		authGroup.POST("/logout", s.authHandler.Logout)
	}

	// Location routes (self-contained, deps created inside Routes)
	// Provider routes (self-contained, deps created inside Routes)
	// Booking routes (self-contained, deps created inside Routes)
	bookingGroup := v1.Group("/bookings")
	authBooking := bookingGroup.Group("")
	authBooking.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
	bookingHttp.Routes(bookingGroup, authBooking, s.db, s.cfg, s.cache)

	// AI Agent routes (public — chatbot endpoint)
	if s.chatHandler != nil {
		aiGroup := v1.Group("/ai")
		{
			aiGroup.POST("/chat", s.chatHandler.Chat)
		}
		// AI sync (admin only — push data to vector DB)
		aiAdmin := v1.Group("/ai")
		aiAdmin.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
		aiAdmin.Use(middlewares.RoleMiddleware("admin", "operator"))
		{
			aiAdmin.POST("/sync", s.chatHandler.SyncData)
		}
	}

	// Admin routes - requires auth + admin/operator role
	admin := v1.Group("/admin")
	admin.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
	admin.Use(middlewares.RoleMiddleware("admin", "operator"))
	{
		// Trip routes (self-contained, deps created inside Routes)
		tripHttp.Routes(v1, admin, s.db)

		// Location routes (public + admin, self-contained)
		locationHttp.Routes(v1, admin, s.db)

		// Provider routes (public + admin, self-contained)
		providerHttp.Routes(v1, admin, s.db)

		// BusType routes (admin-only, self-contained)
		bustypeHttp.Routes(admin, s.db)

		// Bus routes (admin-only, self-contained)
		busHttp.Routes(admin, s.db)

		// Upload routes
		uploadHttp.RegisterRoutes(admin, s.uploadHandler)
	}

	// Public bus-types route (no auth required)
	bustypeHttp.PublicRoutes(v1, s.db)
}

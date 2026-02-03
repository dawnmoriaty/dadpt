package http

import (
	"fmt"
	"net/http"

	"backend/configs"
	authHttp "backend/internals/auth/controller/http"
	busHttp "backend/internals/bus/controller/http"
	bustypeHttp "backend/internals/bustype/controller/http"
	locationHttp "backend/internals/locations/controller/http"
	providerHttp "backend/internals/providers/controller/http"
	tripHttp "backend/internals/trip/controller/http"
	uploadHttp "backend/internals/upload/controller/http"
	"backend/pkgs/jwt"
	"backend/pkgs/middlewares"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine          *gin.Engine
	cfg             *configs.Config
	authHandler     *authHttp.AuthHandler
	tripHandler     *tripHttp.TripHandler
	locationHandler *locationHttp.LocationHandler
	providerHandler *providerHttp.ProviderHandler
	busTypeHandler  *bustypeHttp.BusTypeHandler
	busHandler      *busHttp.BusHandler
	uploadHandler   *uploadHttp.UploadHandler
	jwtProvider     jwt.JWTProvider
	cache           redis.IRedis
}

// NewServer is injectable by DI container
func NewServer(
	cfg *configs.Config,
	authHandler *authHttp.AuthHandler,
	tripHandler *tripHttp.TripHandler,
	locationHandler *locationHttp.LocationHandler,
	providerHandler *providerHttp.ProviderHandler,
	busTypeHandler *bustypeHttp.BusTypeHandler,
	busHandler *busHttp.BusHandler,
	uploadHandler *uploadHttp.UploadHandler,
	jwtProvider jwt.JWTProvider,
	cache redis.IRedis,
) *Server {
	return &Server{
		engine:          gin.Default(),
		cfg:             cfg,
		authHandler:     authHandler,
		tripHandler:     tripHandler,
		locationHandler: locationHandler,
		providerHandler: providerHandler,
		busTypeHandler:  busTypeHandler,
		busHandler:      busHandler,
		uploadHandler:   uploadHandler,
		jwtProvider:     jwtProvider,
		cache:           cache,
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
	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", s.authHandler.Register)
		authGroup.POST("/login", s.authHandler.Login)
		authGroup.POST("/refresh", s.authHandler.RefreshToken)
		authGroup.POST("/logout", s.authHandler.Logout)
	}

	// Public Trip routes
	tripGroup := v1.Group("/trips")
	{
		tripGroup.GET("", s.tripHandler.Search)
		tripGroup.GET("/:id", s.tripHandler.GetByID)
	}

	// Public Location routes
	locationGroup := v1.Group("/locations")
	{
		locationGroup.GET("/search", s.locationHandler.Search)
	}

	// Public Provider routes
	providerGroup := v1.Group("/providers")
	{
		providerGroup.GET("", s.providerHandler.ListActive)
	}

	// Admin routes - requires auth + admin/operator role
	admin := v1.Group("/admin")
	admin.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
	admin.Use(middlewares.RoleMiddleware("admin", "operator"))
	{
		// Admin Trip routes
		adminTrips := admin.Group("/trips")
		{
			adminTrips.POST("", s.tripHandler.Create)
			adminTrips.GET("", s.tripHandler.List)
			adminTrips.PUT("/:id", s.tripHandler.Update)
			adminTrips.PATCH("/:id/status", s.tripHandler.UpdateStatus)
			adminTrips.DELETE("/:id", s.tripHandler.Delete)
		}

		// Admin Location routes
		adminLocations := admin.Group("/locations")
		{
			adminLocations.POST("", s.locationHandler.Create)
			adminLocations.GET("", s.locationHandler.List)
			adminLocations.GET("/:id", s.locationHandler.GetByID)
			adminLocations.PUT("/:id", s.locationHandler.Update)
			adminLocations.DELETE("/:id", s.locationHandler.Delete)
		}

		// Admin Provider routes
		adminProviders := admin.Group("/providers")
		{
			adminProviders.POST("", s.providerHandler.Create)
			adminProviders.GET("", s.providerHandler.List)
			adminProviders.GET("/:id", s.providerHandler.GetByID)
			adminProviders.PUT("/:id", s.providerHandler.Update)
			adminProviders.PATCH("/:id/toggle", s.providerHandler.ToggleActive)
			adminProviders.DELETE("/:id", s.providerHandler.Delete)
		}

		// Admin BusType routes
		bustypeHttp.RegisterRoutes(admin, s.busTypeHandler)

		// Admin Bus routes
		busHttp.RegisterRoutes(admin, s.busHandler)

		// Upload routes
		uploadHttp.RegisterRoutes(admin, s.uploadHandler)
	}
}

package http

import (
	"fmt"
	"net/http"

	"backend/configs"
	"backend/db"
	aiagentHttp "backend/internals/aiagent/controller/http"
	authHttp "backend/internals/auth/controller/http"
	bookingHttp "backend/internals/booking/controller/http"
	"backend/internals/booking/infrastructure"
	busHttp "backend/internals/bus/controller/http"
	bustypeHttp "backend/internals/bustype/controller/http"
	locationHttp "backend/internals/location/controller/http"
	paymentDomain "backend/internals/payment/domain"
	paymentInfra "backend/internals/payment/infrastructure"
	providerHttp "backend/internals/provider/controller/http"
	tripHttp "backend/internals/trip/controller/http"
	uploadHttp "backend/internals/upload/controller/http"
	"backend/pkgs/i18n"
	"backend/pkgs/jwt"
	"backend/pkgs/logger"
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
	sseHub        *infrastructure.SSEHub
}

func NewServer(
	cfg *configs.Config,
	database *db.Database,
	authHandler *authHttp.AuthHandler,
	chatHandler *aiagentHttp.ChatHandler,
	uploadHandler *uploadHttp.UploadHandler,
	jwtProvider jwt.JWTProvider,
	cache redis.IRedis,
	sseHub *infrastructure.SSEHub,
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
		sseHub:        sseHub,
	}
}

func (s *Server) Run() error {
	_ = s.engine.SetTrustedProxies(nil)

	i18n.Init()

	gin.SetMode(gin.ReleaseMode)

	s.engine.Use(middlewares.RecoveryMiddleware())
	s.engine.Use(middlewares.LoggerMiddleware())
	s.engine.Use(middlewares.CorsMiddleware())

	s.engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	s.engine.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Bus Ticketing API v1.0",
		})
	})

	s.MapRoutes()

	return s.engine.Run(fmt.Sprintf(":%d", s.cfg.HTTPPort))
}

func (s *Server) MapRoutes() {
	v1 := s.engine.Group("/api/v1")

	uploadHttp.RegisterPublicRoutes(v1, s.uploadHandler)

	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", s.authHandler.Register)
		authGroup.POST("/login", s.authHandler.Login)
		authGroup.POST("/refresh", s.authHandler.RefreshToken)
		authGroup.POST("/logout", s.authHandler.Logout)
	}

	var paymentGw paymentDomain.PaymentGateway
	if s.cfg.PayOSClientID != "" && s.cfg.PayOSAPIKey != "" && s.cfg.PayOSChecksumKey != "" {
		adapter, err := paymentInfra.NewPayOSAdapter(s.cfg)
		if err != nil {
			logger.Error("Failed to create PayOS adapter: %v", err)
		} else {
			paymentGw = adapter
			logger.Info("PayOS payment gateway initialized")
		}
	}

	bookingGroup := v1.Group("/bookings")
	authBooking := bookingGroup.Group("")
	authBooking.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
	bookingHttp.Routes(bookingGroup, authBooking, s.db, s.cfg, s.cache, paymentGw, s.sseHub)

	if s.chatHandler != nil {
		aiGroup := v1.Group("/ai")
		{
			aiGroup.POST("/chat", s.chatHandler.Chat)
		}

		aiAuth := v1.Group("/ai")
		aiAuth.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
		{
			aiAuth.POST("/voice/booking/validate", s.chatHandler.ValidateVoiceBookingCommand)
			aiAuth.POST("/voice/booking/transcribe", s.chatHandler.VoiceTranscribe)
			aiAuth.POST("/voice/booking/pipeline", s.chatHandler.VoicePipeline)
		}

		aiAdmin := v1.Group("/ai")
		aiAdmin.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
		aiAdmin.Use(middlewares.RoleMiddleware("admin", "operator"))
		{
			aiAdmin.POST("/sync", s.chatHandler.SyncData)
		}
	}

	admin := v1.Group("/admin")
	admin.Use(middlewares.AuthMiddleware(s.jwtProvider, s.cache))
	admin.Use(middlewares.RoleMiddleware("admin", "operator"))
	{
		tripHttp.Routes(v1, admin, s.db)

		locationHttp.Routes(v1, admin, s.db)

		providerHttp.Routes(v1, admin, s.db)

		bustypeHttp.Routes(admin, s.db)

		busHttp.Routes(admin, s.db)

		uploadHttp.RegisterRoutes(admin, s.uploadHandler)

		bookingHttp.AdminRoutes(admin, s.db, s.cfg, s.cache, paymentGw, s.sseHub)
	}

	bustypeHttp.PublicRoutes(v1, s.db)
}

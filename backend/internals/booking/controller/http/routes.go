package http

import (
	"backend/configs"
	"backend/db"
	authRepo "backend/internals/auth/repository"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	locationRepo "backend/internals/location/repository"
	locationUc "backend/internals/location/usecase"
	paymentDomain "backend/internals/payment/domain"
	tripRepo "backend/internals/trip/repository"
	tripUc "backend/internals/trip/usecase"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

func Routes(
	public *gin.RouterGroup,
	authenticated *gin.RouterGroup,
	database *db.Database,
	cfg *configs.Config,
	cache redis.IRedis,
	paymentGw paymentDomain.PaymentGateway,
) {
	repo := repository.NewBookingRepository(database)
	tripLocker := repository.NewTripLocker(database)
	outboxRepo := repository.NewOutboxRepository(database)
	paymentRepo := repository.NewPaymentRepository(database)
	distributedLock := infrastructure.NewDistributedLock(cache)

	uc := usecase.NewBookingUseCase(repo, tripLocker, outboxRepo, paymentRepo, distributedLock, paymentGw, cfg)
	userRepo := authRepo.NewAuthRepository(database)
	locRepository := locationRepo.NewLocationRepository(database)
	locUC := locationUc.NewLocationUseCase(locRepository)
	tripRepository := tripRepo.NewTripRepository(database)
	tripUC := tripUc.NewTripUseCase(tripRepository)

	handler := NewBookingHandler(uc)
	paymentHandler := NewPaymentHandler(uc, paymentGw)
	voiceHandler := NewVoiceBookingHandler(uc, userRepo, locUC, tripUC)

	authenticated.POST("", handler.CreateBooking)
	public.GET("/code/:code", handler.GetBookingByCode)
	public.POST("/payments/webhook", paymentHandler.HandleWebhook)
	public.GET("/payments/:orderCode/status", paymentHandler.GetPaymentStatus)

	authenticated.GET("/my", handler.ListUserBookings)
	authenticated.GET("/:id", handler.GetBooking)
	authenticated.POST("/:id/cancel", handler.CancelBooking)
	authenticated.POST("/voice/execute", voiceHandler.Execute)
}

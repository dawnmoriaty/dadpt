package http

import (
	"backend/configs"
	"backend/db"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	paymentDomain "backend/internals/payment/domain"
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

	handler := NewBookingHandler(uc)
	paymentHandler := NewPaymentHandler(uc, paymentGw)

	authenticated.POST("", handler.CreateBooking)
	public.GET("/code/:code", handler.GetBookingByCode)
	public.POST("/payments/webhook", paymentHandler.HandleWebhook)
	public.GET("/payments/:orderCode/status", paymentHandler.GetPaymentStatus)

	authenticated.GET("/my", handler.ListUserBookings)
	authenticated.GET("/:id", handler.GetBooking)
	authenticated.POST("/:id/cancel", handler.CancelBooking)
}

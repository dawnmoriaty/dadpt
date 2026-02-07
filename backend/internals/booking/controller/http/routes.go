package http

import (
	"backend/configs"
	"backend/db"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/repository"
	"backend/internals/booking/usecase"
	"backend/pkgs/redis"

	"github.com/gin-gonic/gin"
)

// Routes registers booking routes following Hexagonal Architecture.
// Dependencies are created internally — no DIG container needed.
func Routes(public *gin.RouterGroup, authenticated *gin.RouterGroup, database *db.Database, cfg *configs.Config, cache redis.IRedis) {
	// Infrastructure layer
	repo := repository.NewBookingRepository(database)
	tripLocker := repository.NewTripLocker(database)
	distributedLock := infrastructure.NewDistributedLock(cache)

	// Application layer
	uc := usecase.NewBookingUseCase(repo, tripLocker, distributedLock, cfg)

	// Interface layer
	handler := NewBookingHandler(uc)

	// Public routes (guest allowed)
	public.POST("", handler.CreateBooking)
	public.GET("/code/:code", handler.GetBookingByCode)

	// Authenticated routes
	authenticated.GET("/my", handler.ListUserBookings)
	authenticated.GET("/:id", handler.GetBooking)
	authenticated.POST("/:id/cancel", handler.CancelBooking)
}

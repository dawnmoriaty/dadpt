package http

import (
	"backend/internals/booking/controller/dto"
	"backend/internals/booking/domain"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type eventTypeEnvelope struct {
	EventType string `json:"eventType"`
}

type AdminBookingHandler struct {
	uc     usecase.IBookingUseCase
	sseHub *infrastructure.SSEHub
}

func NewAdminBookingHandler(uc usecase.IBookingUseCase, sseHub *infrastructure.SSEHub) *AdminBookingHandler {
	return &AdminBookingHandler{uc: uc, sseHub: sseHub}
}

func (h *AdminBookingHandler) ListBookings(c *gin.Context) {
	var req dto.AdminListBookingsParams
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	result, err := h.uc.ListAdminBookings(c.Request.Context(), &domain.AdminBookingListInput{
		Page:     req.Page,
		PageSize: req.PageSize,
		Status:   req.Status,
		TripID:   req.TripID,
		Search:   req.Search,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingListResponse(result))
}

func (h *AdminBookingHandler) GetStats(c *gin.Context) {
	stats, err := h.uc.GetAdminBookingStats(c.Request.Context())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToAdminBookingStatsResponse(stats))
}

func (h *AdminBookingHandler) GetRevenueSeries(c *gin.Context) {
	daysValue := strings.TrimSpace(c.DefaultQuery("days", "7"))
	days, err := strconv.Atoi(daysValue)
	if err != nil || days <= 0 {
		response.HandleError(c, pkgErrors.ValidationError("invalid days"))
		return
	}

	series, err := h.uc.GetAdminRevenueSeries(c.Request.Context(), int32(days))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToAdminRevenueSeriesResponse(series))
}

func (h *AdminBookingHandler) GetBookingDetail(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	booking, err := h.uc.GetBooking(c.Request.Context(), id)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	if paymentTx, txErr := h.uc.GetLatestPaymentByBookingID(c.Request.Context(), booking.ID); txErr == nil && paymentTx != nil {
		booking.OrderCode = paymentTx.OrderCode
	}

	response.Success(c, dto.ToBookingDetailResponse(booking))
}

func (h *AdminBookingHandler) UpdateBookingStatus(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	var req dto.AdminUpdateBookingStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	updated, err := h.uc.AdminUpdateBookingStatus(c.Request.Context(), &domain.AdminUpdateBookingStatusInput{
		BookingID: id,
		Status:    domain.BookingStatus(req.Status),
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(updated))
}

func (h *AdminBookingHandler) ConfirmCOD(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	booking, err := h.uc.GetBooking(c.Request.Context(), id)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	if strings.TrimSpace(strings.ToLower(booking.PaymentMethod)) != "cod" {
		response.HandleError(c, pkgErrors.ValidationError("booking payment method is not cod"))
		return
	}

	updated, err := h.uc.AdminUpdateBookingStatus(c.Request.Context(), &domain.AdminUpdateBookingStatusInput{
		BookingID: id,
		Status:    domain.StatusPaid,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(updated))
}

func (h *AdminBookingHandler) ExportBookingsCSV(c *gin.Context) {
	status := strings.TrimSpace(c.Query("status"))
	search := strings.TrimSpace(c.Query("search"))
	tripIDValue := strings.TrimSpace(c.Query("tripId"))
	tripID := int64(0)
	if tripIDValue != "" {
		parsedTripID, err := strconv.ParseInt(tripIDValue, 10, 64)
		if err != nil || parsedTripID <= 0 {
			response.HandleError(c, pkgErrors.ValidationError("invalid trip id"))
			return
		}
		tripID = parsedTripID
	}

	result, err := h.uc.ListAdminBookings(c.Request.Context(), &domain.AdminBookingListInput{
		Limit:  10000,
		Offset: 0,
		Status: status,
		TripID: tripID,
		Search: search,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	buffer := &bytes.Buffer{}
	writer := csv.NewWriter(buffer)
	_ = writer.Write([]string{"booking_code", "trip_id", "guest_name", "guest_phone", "seats", "status", "payment_method", "total_amount", "origin", "destination", "created_at"})
	for _, booking := range result.Bookings {
		if booking == nil {
			continue
		}
		_ = writer.Write([]string{
			string(booking.Code),
			strconv.FormatInt(booking.TripID, 10),
			booking.GuestInfo.Name,
			booking.GuestInfo.Phone,
			strings.Join(booking.SeatCodes, ","),
			string(booking.Status),
			booking.PaymentMethod,
			fmt.Sprintf("%.0f", booking.TotalAmount),
			booking.OriginName,
			booking.DestinationName,
			booking.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
	writer.Flush()

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=admin-bookings.csv")
	c.String(200, buffer.String())
}

func (h *AdminBookingHandler) GetTripSeatManifest(c *gin.Context) {
	tripID, err := parseID(c, "tripId")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid trip id"))
		return
	}

	manifest, err := h.uc.GetTripSeatManifest(c.Request.Context(), tripID)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToTripSeatManifestResponse(manifest))
}

func (h *AdminBookingHandler) ListRefundRequests(c *gin.Context) {
	var req dto.ListRefundRequestsParams
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	result, err := h.uc.ListRefundRequests(c.Request.Context(), &domain.RefundRequestListInput{
		Page:     req.Page,
		PageSize: req.PageSize,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToRefundRequestListResponse(result))
}

func (h *AdminBookingHandler) CountRefundPending(c *gin.Context) {
	count, err := h.uc.CountRefundPending(c.Request.Context())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, map[string]int64{"count": count})
}

func (h *AdminBookingHandler) ApproveRefund(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	var req dto.RefundActionRequest
	_ = c.ShouldBindJSON(&req)

	booking, err := h.uc.ApproveRefund(c.Request.Context(), &domain.RefundRequestInput{
		BookingID:       id,
		Reason:          req.Reason,
		RefundReference: req.RefundReference,
		RefundNote:      req.RefundNote,
		ConfirmCode:     req.ConfirmCode,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

func (h *AdminBookingHandler) RejectRefund(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	var req dto.RefundActionRequest
	_ = c.ShouldBindJSON(&req)

	booking, err := h.uc.RejectRefund(c.Request.Context(), &domain.RefundRequestInput{
		BookingID:   id,
		Reason:      req.Reason,
		ConfirmCode: req.ConfirmCode,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

func (h *AdminBookingHandler) StreamRefundEvents(c *gin.Context) {
	if h.sseHub == nil {
		c.JSON(500, gin.H{"error": "SSE not available"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	clientCh := make(chan []byte, 10)
	h.sseHub.Register(clientCh)
	defer h.sseHub.Unregister(clientCh)

	c.SSEvent("connected", `{"message":"connected"}`)
	c.Writer.Flush()

	ctx := c.Request.Context()

	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			return false
		case data, ok := <-clientCh:
			if !ok {
				return false
			}
			c.SSEvent(getAdminSSEEventName(data), string(data))
			c.Writer.Flush()
			fmt.Fprint(w, "")
			return true
		}
	})
}

func getAdminSSEEventName(data []byte) string {
	var envelope eventTypeEnvelope

	if err := json.Unmarshal(data, &envelope); err != nil {
		return "booking_event"
	}

	switch envelope.EventType {
	case usecase.TopicBookingRefundRequested:
		return "refund_requested"
	case usecase.TopicBookingCancelled:
		return "booking_cancelled"
	case usecase.TopicBookingRefundApproved:
		return "refund_approved"
	case usecase.TopicBookingRefundRejected:
		return "refund_rejected"
	case usecase.TopicBookingStatusUpdated:
		return "booking_status_updated"
	default:
		return "booking_event"
	}
}

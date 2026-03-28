package rmq_config

const (
	// Exchanges
	ExchangeBooking = "cloud.booking.topic"
	ExchangeDLX     = "cloud.booking.dlx"

	// Routing Keys
	RoutingRefundRequest = "booking.refund.requested"
	RoutingRefundApprove = "booking.refund.approved"
	RoutingRefundReject  = "booking.refund.rejected"
	RoutingDLXDead       = "booking.events.dead"

	// Queues
	QueueAdminRefund    = "cloud.admin.refund.queue"
	QueueAdminRefundDLQ = "cloud.admin.refund.dlq"
)

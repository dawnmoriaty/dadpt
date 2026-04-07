export function buildPaymentResumePath(bookingCode: string, orderCode?: string): string {
    const safeCode = bookingCode.trim()
    if (!safeCode) {
        return '/my-bookings'
    }

    if (orderCode?.trim()) {
        return `/payment/${encodeURIComponent(safeCode)}?orderCode=${encodeURIComponent(orderCode.trim())}`
    }

    return `/payment/${encodeURIComponent(safeCode)}`
}

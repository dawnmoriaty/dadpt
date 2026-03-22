export function buildPaymentResumePath(bookingCode: string, orderCode?: string): string {
    const safeCode = bookingCode.trim()
    if (!safeCode) {
        return '/my-bookings'
    }

    const params = new URLSearchParams()
    if (orderCode?.trim()) {
        params.set('orderCode', orderCode.trim())
    }

    const query = params.toString()
    return query ? `/payment/${encodeURIComponent(safeCode)}?${query}` : `/payment/${encodeURIComponent(safeCode)}`
}

import { toast } from 'sonner'

/**
 * Enhanced notification system with Vietnamese messages and better styling
 */

export const notifications = {
  /**
   * Success notification
   */
  success: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: '✅',
      duration: 4000,
    })
  },

  /**
   * Error notification
   */
  error: (message: string, description?: string) => {
    return toast.error(message, {
      description,
      icon: '❌',
      duration: 5000,
    })
  },

  /**
   * Loading notification
   */
  loading: (message: string, description?: string) => {
    return toast.loading(message, {
      description,
      duration: Infinity,
    })
  },

  /**
   * Warning notification
   */
  warning: (message: string, description?: string) => {
    return toast.warning(message, {
      description,
      icon: '⚠️',
      duration: 4000,
    })
  },

  /**
   * Info notification
   */
  info: (message: string, description?: string) => {
    return toast.info(message, {
      description,
      icon: 'ℹ️',
      duration: 4000,
    })
  },

  /**
   * Promise notification for async operations
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    })
  },
}

/**
 * Common Vietnamese notification messages
 */
export const notificationMessages = {
  // Success messages
  bookingSuccess: {
    title: 'Đặt vé thành công!',
    description: 'Xác nhận đã được gửi đến email của bạn',
  },
  paymentSuccess: {
    title: 'Thanh toán thành công!',
    description: 'Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi',
  },
  updateSuccess: {
    title: 'Cập nhật thành công!',
    description: 'Thông tin của bạn đã được lưu',
  },
  deleteSuccess: {
    title: 'Xóa thành công!',
    description: 'Dữ liệu đã được xóa khỏi hệ thống',
  },

  // Error messages
  bookingError: {
    title: 'Lỗi đặt vé!',
    description: 'Vui lòng thử lại hoặc liên hệ với hỗ trợ',
  },
  paymentError: {
    title: 'Lỗi thanh toán!',
    description: 'Giao dịch không thành công, vui lòng thử lại',
  },
  networkError: {
    title: 'Lỗi kết nối!',
    description: 'Vui lòng kiểm tra kết nối internet của bạn',
  },
  validationError: {
    title: 'Vui lòng kiểm tra lại!',
    description: 'Một số trường dữ liệu chưa được nhập đúng',
  },

  // Loading messages
  searching: {
    title: 'Đang tìm kiếm...',
    description: 'Vui lòng chờ trong giây lát',
  },
  processing: {
    title: 'Đang xử lý...',
    description: 'Vui lòng không tắt trang này',
  },
}

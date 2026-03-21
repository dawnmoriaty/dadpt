import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Bus, Clock, Shield, Star, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SearchForm, UpcomingTrips, type SearchTripsFormData } from '@/modules/booking'

function HomePage() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const handleSearch = (data: SearchTripsFormData) => {
        navigate({
            to: '/search',
            search: {
                originId: data.originId,
                destinationId: data.destinationId,
                departureDate: data.departureDate,
                passengers: data.passengers,
            },
        })
    }

    return (
        <div className="flex flex-col">
            {/* Hero Section with Blue Gradient Background */}
            <section className="relative min-h-[600px] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-400 via-blue-300 to-blue-200">
                <div
                    className="absolute inset-0 bg-cover bg-center z-0 opacity-30"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop")',
                    }}
                />
                
                <div className="relative z-10 container mx-auto max-w-7xl px-4 flex flex-col items-center text-center py-12">
                    {/* Promotional Banner */}
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg mb-2 leading-tight">
                            Thứ 3 Hàng Tuần<br />Flash Sale Từng Bùng
                        </h2>
                        <p className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
                            GIẢM ĐẾN <span className="bg-yellow-400 px-3 py-1 rounded-lg text-gray-900">50%</span>
                        </p>
                    </div>

                    {/* Search Form - Horizontal Layout */}
                    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <SearchForm onSearch={handleSearch} compact={true} />
                    </div>
                </div>
            </section>

            {/* Benefits Bar - Vexere Style */}
            <section className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-8">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-2xl mb-2">✓</div>
                            <p className="font-semibold text-sm">Chắc chắn có chỗ</p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2">📞</div>
                            <p className="font-semibold text-sm">Hỗ trợ 24/7</p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2">🎁</div>
                            <p className="font-semibold text-sm">Nhiều ưu đãi</p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2">💳</div>
                            <p className="font-semibold text-sm">Thanh toán an toàn</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Upcoming Trips */}
            <UpcomingTrips />

            {/* Why Choose Us */}
            <section className="bg-gradient-to-b from-white to-blue-50/30 py-20">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tại sao chọn chúng tôi?</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Chúng tôi cam kết mang đến trải nghiệm đặt vé tốt nhất cho bạn</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-white border border-green-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mb-6 border border-green-200">
                                <Clock className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Đặt Vé Nhanh</h3>
                            <p className="text-muted-foreground">Chỉ cần 2 phút để tìm và đặt vé. Nhận xác nhận tức thì qua email và SMS.</p>
                        </div>
                        
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-6 border border-blue-200">
                                <Shield className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Thanh Toán An Toàn</h3>
                            <p className="text-muted-foreground">Mã hóa SSL, đa cách thanh toán, bảo vệ thông tin cá nhân tuyệt đối.</p>
                        </div>
                        
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mb-6 border border-orange-200">
                                <Users className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Hỗ Trợ 24/7</h3>
                            <p className="text-muted-foreground">Đội tư vấn sẵn sàng giải đáp mọi thắc mắc qua chat, phone, email.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="container mx-auto max-w-6xl px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100">
                        <Star className="h-6 w-6 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-foreground">4.8/5</p>
                            <p className="text-sm text-muted-foreground">Đánh giá từ khách hàng</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                        <Shield className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-foreground">100% An Toàn</p>
                            <p className="text-sm text-muted-foreground">Mã hóa SSL, bảo mật cao</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                        <Users className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-foreground">100K+</p>
                            <p className="text-sm text-muted-foreground">Khách hàng đang sử dụng</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-gradient-to-b from-white to-gray-50">
                <div className="container mx-auto max-w-6xl px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <h4 className="font-bold text-foreground mb-4">Về chúng tôi</h4>
                            <p className="text-sm text-muted-foreground">Nền tảng đặt vé xe trực tuyến hàng đầu Việt Nam. Chúng tôi cam kết mang đến dịch vụ tốt nhất cho bạn.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground mb-4">Liên hệ</h4>
                            <p className="text-sm text-muted-foreground">📞 Hotline: 1900-xxxx</p>
                            <p className="text-sm text-muted-foreground">📧 Email: support@datvexe.vn</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground mb-4">Theo dõi chúng tôi</h4>
                            <p className="text-sm text-muted-foreground">Facebook • Instagram • Twitter</p>
                        </div>
                    </div>
                    
                    <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p>© 2025 Đặt Vé Xe. Tất cả quyền được bảo lưu.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-primary transition-colors">Điều khoản sử dụng</a>
                            <a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export const Route = createFileRoute('/_public/')({
    component: HomePage,
})

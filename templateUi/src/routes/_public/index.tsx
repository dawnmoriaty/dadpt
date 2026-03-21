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
            {/* Hero Section */}
            <section className="relative min-h-[580px] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white">
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop")',
                        filter: 'brightness(0.35)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/30 to-transparent z-[1]" />

                <div className="relative z-10 container mx-auto max-w-6xl px-4 py-20 flex flex-col items-center text-center">
                    <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 mb-6">
                            <Bus className="h-5 w-5 text-white" />
                            <span className="text-sm font-semibold text-white">Đặt vé xe trực tuyến</span>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-xl mb-4 leading-tight max-w-3xl">
                        Tìm và Đặt Vé Xe <span className="text-blue-200">Một Cách Dễ Dàng</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-100 mb-12 max-w-2xl drop-shadow-md leading-relaxed">
                        Hàng ngàn chuyến xe, giá tốt nhất, thanh toán an toàn. Đặt vé trong 2 phút, nhận xác nhận tức thì.
                    </p>

                    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <SearchForm onSearch={handleSearch} />
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <div className="container mx-auto max-w-6xl px-4 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <p className="text-4xl md:text-3xl font-bold mb-1">2000+</p>
                            <p className="text-sm opacity-90">Chuyến xe mỗi ngày</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-3xl font-bold mb-1">500+</p>
                            <p className="text-sm opacity-90">Tuyến đường</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-3xl font-bold mb-1">150+</p>
                            <p className="text-sm opacity-90">Nhà cung cấp</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-3xl font-bold mb-1">100K+</p>
                            <p className="text-sm opacity-90">Khách hàng tin tưởng</p>
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

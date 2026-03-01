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
            <section className="relative min-h-[520px] flex flex-col items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop")',
                        filter: 'brightness(0.45)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/60 z-[1]" />

                <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-4">
                        <Bus className="h-10 w-10 text-white" />
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
                            {t('home.heroTitle')}
                        </h1>
                    </div>
                    <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-2xl drop-shadow-md">
                        {t('home.heroSubtitle')}
                    </p>

                    <SearchForm onSearch={handleSearch} />
                </div>
            </section>

            {/* Stats Bar */}
            <section className="bg-primary text-primary-foreground">
                <div className="container mx-auto px-4 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <p className="text-3xl font-bold">2000+</p>
                            <p className="text-sm opacity-80">{t('home.statTrips')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">150+</p>
                            <p className="text-sm opacity-80">{t('home.statProviders')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">500+</p>
                            <p className="text-sm opacity-80">{t('home.statRoutes')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">100K+</p>
                            <p className="text-sm opacity-80">{t('home.statCustomers')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Upcoming Trips */}
            <UpcomingTrips />

            {/* Why Choose Us */}
            <section className="bg-muted/50 py-16">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-10">{t('home.whyChooseUs')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
                            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <Clock className="h-7 w-7 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{t('home.featureInstant')}</h3>
                            <p className="text-muted-foreground text-sm">{t('home.featureInstantDesc')}</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
                            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Shield className="h-7 w-7 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{t('home.featureSecure')}</h3>
                            <p className="text-muted-foreground text-sm">{t('home.featureSecureDesc')}</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
                            <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                                <Users className="h-7 w-7 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{t('home.featureSupport')}</h3>
                            <p className="text-muted-foreground text-sm">{t('home.featureSupportDesc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="container mx-auto px-4 py-12">
                <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">4.8/5 Google Reviews</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">100.000+ Khách hàng</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-muted/30">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p>© 2025 Đặt Vé Xe. All rights reserved.</p>
                        <div className="flex gap-4">
                            <span>Hotline: 1900-xxxx</span>
                            <span>Email: support@datvexe.vn</span>
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

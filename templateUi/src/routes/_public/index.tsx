import { createFileRoute } from '@tanstack/react-router'

import { SearchForm } from '@/features/search/search-form'

function HomePage() {
    return (
        <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
            {/* Hero Section Background */}
            <div
                className="absolute inset-0 bg-cover bg-center z-0"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop")',
                    filter: 'brightness(0.6)'
                }}
            />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1 text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
                    Vietnam's Premier Bus Booking Platform
                </h1>
                <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-2xl drop-shadow-md">
                    Seamless travel across the country. Book your tickets instantly with Antigravity Bus.
                </p>

                <SearchForm />

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                        <div className="text-4xl mb-2">⚡</div>
                        <h3 className="text-xl font-bold mb-2">Instant Booking</h3>
                        <p className="opacity-80">Get your confirmed ticket in less than 2 minutes.</p>
                    </div>
                    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                        <div className="text-4xl mb-2">🛡️</div>
                        <h3 className="text-xl font-bold mb-2">Secure Payment</h3>
                        <p className="opacity-80">100% secure payment with various methods.</p>
                    </div>
                    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                        <div className="text-4xl mb-2">📞</div>
                        <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
                        <p className="opacity-80">We are always here to help you with your journey.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/_public/')({
    component: HomePage,
})

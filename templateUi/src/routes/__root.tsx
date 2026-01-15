import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import { ThemeProvider } from '@/components/theme-provider'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

import { Header } from '@/components/common/header'

export const Route = createRootRoute({
    component: () => (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <div className="flex min-h-screen flex-col">
                    <Header />
                    <main className="flex-1">
                        <Outlet />
                    </main>
                </div>
                {import.meta.env.DEV && (
                    <>
                        <ReactQueryDevtools initialIsOpen={false} />
                        <TanStackRouterDevtools />
                    </>
                )}
            </ThemeProvider>
        </QueryClientProvider>
    ),
})

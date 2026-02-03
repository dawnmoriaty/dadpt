import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'

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

function RootComponent() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <Toaster richColors position="top-right" />
                <Outlet />
                {import.meta.env.DEV && (
                    <>
                        <ReactQueryDevtools initialIsOpen={false} />
                        <TanStackRouterDevtools />
                    </>
                )}
            </ThemeProvider>
        </QueryClientProvider>
    )
}

export const Route = createRootRoute({
    component: RootComponent,
})

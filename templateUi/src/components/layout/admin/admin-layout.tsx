'use client'

import { Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { cn } from '@/lib/utils'

import { Header } from './header'
import { Sidebar } from './sidebar'

export function AdminLayout() {
    const [sidebarCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar />
            
            <div 
                className={cn(
                    'transition-all duration-300',
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                )}
            >
                <Header />
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

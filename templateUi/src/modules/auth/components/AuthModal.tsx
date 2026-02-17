import { useState } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

interface AuthModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: 'login' | 'register'
}

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
    const [tab, setTab] = useState<'login' | 'register'>(defaultTab)

    const handleSuccess = () => {
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                    </DialogTitle>
                </DialogHeader>
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                        <TabsTrigger value="register">Đăng ký</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                        <LoginForm onSuccess={handleSuccess} />
                    </TabsContent>
                    <TabsContent value="register">
                        <RegisterForm onSuccess={handleSuccess} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { api } from "@/services/api/client"
import { useAuthStore } from "@/stores/use-auth-store"
import type { ApiError, AuthResponse } from "@/types/auth.types"

const loginSchema = z.object({
    identifier: z.string().min(3, "Phone or Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
    onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const setAuth = useAuthStore((state) => state.setAuth)

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: "",
            password: "",
        },
    })

    async function onSubmit(values: LoginFormData) {
        setIsLoading(true)
        setError("")

        try {
            const res = await api.post<{ data: AuthResponse }>("/auth/login", values)
            const { accessToken, user } = res.data.data

            localStorage.setItem("token", accessToken)
            setAuth(accessToken, user)

            onSuccess?.()

            // Role-based redirection
            window.location.href = user.role === 'admin' ? '/admin/dashboard' : '/'
        } catch (err) {
            const apiError = err as ApiError
            setError(apiError.response?.data?.message || "Login failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-4 py-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="identifier"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone or Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="0987..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Login
                    </Button>
                </form>
            </Form>
        </div>
    )
}

import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/modules/user'

export const Route = createFileRoute('/admin/users/')({
    component: UsersPage,
})

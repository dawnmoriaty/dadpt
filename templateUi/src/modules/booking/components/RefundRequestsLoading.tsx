import { Skeleton } from '@/components/ui/skeleton'

export function RefundRequestsLoading() {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
}

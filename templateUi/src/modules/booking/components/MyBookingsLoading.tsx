import { Card, CardContent } from '@/components/ui/card'

export function MyBookingsLoading() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((item) => (
                <Card key={item} className="animate-pulse">
                    <CardContent className="p-6">
                        <div className="h-20 bg-muted rounded" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

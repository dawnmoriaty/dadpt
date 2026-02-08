import { Search } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SearchParams {
    origin: string
    destination: string
    date: string
}

export function SearchForm() {
    const { register, handleSubmit } = useForm<SearchParams>()

    const onSubmit = (data: SearchParams) => {
        console.log("Search params:", data)
        alert(`Searching for trips from ${data.origin} to ${data.destination} on ${data.date}`)
        // TODO: Navigate to search results page
    }

    return (
        <Card className="w-full max-w-4xl shadow-xl bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
            <CardContent className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="origin" className="text-sm font-medium">
                            From
                        </Label>
                        <div className="relative">
                            <Input
                                id="origin"
                                placeholder="Hanoi"
                                className="pl-8"
                                {...register("origin", { required: true })}
                            />
                            <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                                <div className="h-4 w-4 rounded-full border-2 border-primary/60" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="destination" className="text-sm font-medium">
                            To
                        </Label>
                        <div className="relative">
                            <Input
                                id="destination"
                                placeholder="Ho Chi Minh City"
                                className="pl-8"
                                {...register("destination", { required: true })}
                            />
                            <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                                <div className="h-4 w-4 rounded-full border-2 border-red-500/60" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-medium">
                            Departure Date
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            className="block"
                            {...register("date", { required: true })}
                        />
                    </div>

                    <Button type="submit" size="lg" className="w-full text-lg font-semibold">
                        <Search className="mr-2 h-5 w-5" />
                        Search Tickets
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

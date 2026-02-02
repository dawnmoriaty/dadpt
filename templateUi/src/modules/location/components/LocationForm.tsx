import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { Location } from '../types'

interface LocationFormProps {
    location?: Location | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; city: string; address: string; keywords: string }) => void
    isLoading?: boolean
}

export function LocationForm({ location, isOpen, onClose, onSubmit, isLoading }: LocationFormProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
            name: formData.get('name') as string,
            city: formData.get('city') as string,
            address: formData.get('address') as string,
            keywords: formData.get('keywords') as string,
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {location ? 'Edit Location' : 'Add New Location'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={location?.name}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            name="city"
                            defaultValue={location?.city}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            name="address"
                            defaultValue={location?.address}
                        />
                    </div>
                    <div>
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input
                            id="keywords"
                            name="keywords"
                            defaultValue={location?.keywords}
                            placeholder="comma-separated"
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {location ? 'Update' : 'Create'} Location
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

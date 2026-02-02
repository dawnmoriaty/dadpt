import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { Provider } from '../types'

interface ProviderFormProps {
    provider?: Provider | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; hotline: string; slug: string; policyRefund: string }) => void
    isLoading?: boolean
}

export function ProviderForm({ provider, isOpen, onClose, onSubmit, isLoading }: ProviderFormProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
            name: formData.get('name') as string,
            hotline: formData.get('hotline') as string,
            slug: formData.get('slug') as string,
            policyRefund: formData.get('policyRefund') as string,
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {provider ? 'Edit Provider' : 'Add New Provider'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={provider?.name}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="hotline">Hotline</Label>
                        <Input
                            id="hotline"
                            name="hotline"
                            defaultValue={provider?.hotline}
                        />
                    </div>
                    <div>
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            name="slug"
                            defaultValue={provider?.slug}
                            placeholder="auto-generated if empty"
                        />
                    </div>
                    <div>
                        <Label htmlFor="policyRefund">Refund Policy</Label>
                        <Input
                            id="policyRefund"
                            name="policyRefund"
                            defaultValue={provider?.policyRefund}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {provider ? 'Update' : 'Create'} Provider
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

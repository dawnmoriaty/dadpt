import { X, Image as ImageIcon, Upload } from 'lucide-react'
import { useState, useRef } from 'react'

import { Button } from '@/components/ui/button'

import { useUploadImage, useUploadImages } from '../hooks'

interface ImageUploadProps {
    value?: string
    onChange?: (url: string | null) => void
    className?: string
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(value || null)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadImage()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn tệp hình ảnh')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Kích thước ảnh phải nhỏ hơn 5MB')
            return
        }

        setError(null)

        // Show preview
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsDataURL(file)

        try {
            const response = await uploadMutation.mutateAsync({ file })
            onChange?.(response.url)
        } catch {
            setError('Tải ảnh thất bại. Vui lòng thử lại.')
            setPreview(null)
            onChange?.(null)
        }
    }

    const handleRemove = () => {
        setPreview(null)
        onChange?.(null)
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div className={className}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {preview ? (
                <div className="relative inline-block">
                    <img
                        src={preview}
                        alt="Xem trước"
                        className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleRemove}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                >
                    {uploadMutation.isPending ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        ) : (
                            <>
                                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-xs text-muted-foreground">Bấm để tải ảnh</span>
                            </>
                        )}
                    </div>
            )}

            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
    )
}

interface MultiImageUploadProps {
    values?: string[]
    onChange?: (urls: string[]) => void
    maxImages?: number
    className?: string
}

export function MultiImageUpload({
    values = [],
    onChange,
    maxImages = 5,
    className,
}: MultiImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadImages()

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const remainingSlots = maxImages - values.length
        const filesToUpload = files.slice(0, remainingSlots)

        try {
            const responses = await uploadMutation.mutateAsync({ files: filesToUpload })
            const newUrls = responses.map((r) => r.url)
            onChange?.([...values, ...newUrls])
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const handleRemove = (index: number) => {
        const newValues = values.filter((_, i) => i !== index)
        onChange?.(newValues)
    }

    return (
        <div className={className}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="hidden"
            />

            <div className="flex flex-wrap gap-3">
                {values.map((url, index) => (
                    <div key={index} className="relative">
                        <img
                            src={url}
                            alt={`Image ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => handleRemove(index)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}

                {values.length < maxImages && (
                    <div
                        onClick={() => inputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    >
                        {uploadMutation.isPending ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground mt-1">
                                    {values.length}/{maxImages}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

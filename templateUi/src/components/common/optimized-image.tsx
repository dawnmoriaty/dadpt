import { Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

interface OptimizedImageProps {
    src: string | undefined | null
    alt: string
    width?: number
    height?: number
    className?: string
    fallbackClassName?: string
    objectFit?: 'cover' | 'contain' | 'fill'
}

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    className,
    fallbackClassName,
    objectFit = 'cover',
}: OptimizedImageProps) {
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    if (!src || error) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center bg-muted rounded',
                    fallbackClassName ?? className,
                )}
                style={{ width, height }}
            >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className={cn('relative overflow-hidden rounded', className)} style={{ width, height }}>
            {/* Blur placeholder while loading */}
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-muted rounded" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={cn(
                    'w-full h-full transition-opacity duration-300 rounded',
                    objectFit === 'cover' && 'object-cover',
                    objectFit === 'contain' && 'object-contain',
                    objectFit === 'fill' && 'object-fill',
                    loaded ? 'opacity-100' : 'opacity-0',
                )}
            />
        </div>
    )
}

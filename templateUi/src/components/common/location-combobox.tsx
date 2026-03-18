import { Check, Loader2, MapPin, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSearchLocations } from '@/modules/location'

interface LocationComboboxProps {
    value: number
    onSelect: (id: number) => void
    placeholder?: string
    selectedLabel?: string
    className?: string
    disabled?: boolean
}

export function LocationCombobox({
    value,
    onSelect,
    placeholder,
    selectedLabel,
    className,
    disabled,
}: LocationComboboxProps) {
    const { t } = useTranslation()
    const [inputValue, setInputValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const debouncedQuery = useDebounce(inputValue, 300)
    const { data: locations, isLoading } = useSearchLocations(debouncedQuery)
    const items = locations ?? []

    // Resolve label from value on mount / when items load
    useEffect(() => {
        if (value && selectedLabel) {
            setInputValue(selectedLabel)
            return
        }

        if (value && !inputValue && items.length > 0) {
            const found = items.find((loc) => loc.id === value)
            if (found) {
                setInputValue(`${found.name} - ${found.city}`)
            }
        }
        // Only run when value or items change, not inputValue
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, items, selectedLabel])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const el = listRef.current.children[highlightIndex] as HTMLElement | undefined
            el?.scrollIntoView({ block: 'nearest' })
        }
    }, [highlightIndex])

    const handleSelect = useCallback(
        (id: number, name: string, city: string) => {
            onSelect(id)
            setInputValue(`${name} - ${city}`)
            setIsOpen(false)
            setHighlightIndex(-1)
        },
        [onSelect],
    )

    const handleClear = useCallback(() => {
        onSelect(0)
        setInputValue('')
        setIsOpen(false)
        inputRef.current?.focus()
    }, [onSelect])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen) {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    setIsOpen(true)
                    e.preventDefault()
                }
                return
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setHighlightIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setHighlightIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
                    break
                case 'Enter':
                    e.preventDefault()
                    if (highlightIndex >= 0 && items[highlightIndex]) {
                        const loc = items[highlightIndex]
                        handleSelect(loc.id, loc.name, loc.city)
                    }
                    break
                case 'Escape':
                    setIsOpen(false)
                    setHighlightIndex(-1)
                    break
            }
        },
        [isOpen, items, highlightIndex, handleSelect],
    )

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setIsOpen(true)
                        setHighlightIndex(-1)
                        // If user clears text, clear selection
                        if (e.target.value === '') {
                            onSelect(0)
                        }
                    }}
                    onFocus={() => {
                        if (inputValue.length > 0 || items.length > 0) {
                            setIsOpen(true)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder ?? t('location.placeholder')}
                    disabled={disabled}
                    className="pl-9 pr-8"
                    autoComplete="off"
                />
                {value > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        tabIndex={-1}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                {isLoading && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {isOpen && items.length > 0 && (
                <ul
                    ref={listRef}
                    role="listbox"
                    className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
                >
                    {items.map((loc, index) => (
                        <li
                            key={loc.id}
                            role="option"
                            aria-selected={value === loc.id}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors',
                                highlightIndex === index && 'bg-accent',
                                value === loc.id && 'text-primary font-medium',
                            )}
                            onMouseEnter={() => setHighlightIndex(index)}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                handleSelect(loc.id, loc.name, loc.city)
                            }}
                        >
                            <Check
                                className={cn(
                                    'h-4 w-4 shrink-0',
                                    value === loc.id ? 'opacity-100 text-primary' : 'opacity-0',
                                )}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="truncate font-medium">{loc.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {loc.city} — {loc.address}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && !isLoading && debouncedQuery.length > 0 && items.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 shadow-lg text-center text-sm text-muted-foreground">
                    {t('location.noResults')}
                </div>
            )}
        </div>
    )
}

/** Debounce hook */
function useDebounce(value: string, delay: number): string {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

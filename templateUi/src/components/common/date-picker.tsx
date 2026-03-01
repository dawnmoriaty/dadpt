import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
    value?: Date
    onChange: (date: Date | undefined) => void
    placeholder?: string
    minDate?: Date
    maxDate?: Date
    className?: string
    disabled?: boolean
}

export function DatePicker({
    value,
    onChange,
    placeholder = 'Chọn ngày',
    minDate,
    maxDate,
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = useState(false)

    const handleSelectToday = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        onChange(today)
        setOpen(false)
    }

    const handleSelect = (date: Date | undefined) => {
        onChange(date)
        if (date) {
            setOpen(false)
        }
    }

    const formatDisplayDate = (date: Date): string => {
        return format(date, "dd/MM/yyyy (EEEE)", { locale: vi })
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full justify-start text-left font-normal h-9',
                        !value && 'text-muted-foreground',
                        className,
                    )}
                    disabled={disabled}
                >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/70" />
                    {value ? (
                        <span className="truncate">{formatDisplayDate(value)}</span>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 rounded-xl shadow-xl border-border/50"
                align="start"
            >
                <div className="p-3 pb-1 flex items-center justify-between border-b">
                    <span className="text-sm font-semibold text-foreground">Chọn ngày khởi hành</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={handleSelectToday}
                    >
                        Hôm nay
                    </Button>
                </div>
                <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={value}
                    onSelect={handleSelect}
                    disabled={(date) => {
                        if (minDate && date < minDate) return true
                        if (maxDate && date > maxDate) return true
                        return false
                    }}
                    locale={vi}
                    autoFocus
                    className="p-3"
                    startMonth={minDate}
                    endMonth={maxDate ?? new Date(new Date().getFullYear() + 1, 11)}
                />
            </PopoverContent>
        </Popover>
    )
}

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
    placeholder,
    minDate,
    maxDate,
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const { t } = useTranslation()

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
                        'w-full justify-start text-left font-normal h-11 px-4 rounded-lg border-blue-100 hover:border-primary/30 hover:bg-blue-50/50 transition-all duration-200',
                        !value && 'text-muted-foreground',
                        value && 'border-primary/20 bg-primary/5 text-foreground font-medium',
                        className,
                    )}
                    disabled={disabled}
                >
                    <CalendarDays className="mr-3 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">
                        {value ? formatDisplayDate(value) : (placeholder ?? 'Chọn ngày...')}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 rounded-xl shadow-xl border-blue-100/50 bg-white"
                align="start"
            >
                <div className="p-4 pb-2 flex items-center justify-between border-b border-blue-100">
                    <span className="text-sm font-semibold text-foreground">Chọn ngày khởi hành</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
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
                    className="p-4 [--cell-size:2.5rem] text-sm"
                    startMonth={minDate}
                    endMonth={maxDate ?? new Date(new Date().getFullYear() + 1, 11)}
                />
            </PopoverContent>
        </Popover>
    )
}

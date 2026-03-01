import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
    value?: Date
    onChange: (date: Date | undefined) => void
    placeholder?: string
    minDate?: Date
    className?: string
    disabled?: boolean
}

export function DateTimePicker({
    value,
    onChange,
    placeholder = 'Pick date & time',
    minDate,
    className,
    disabled,
}: DateTimePickerProps) {
    const timeValue = value ? format(value, 'HH:mm') : ''

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) {
            onChange(undefined)
            return
        }
        // Preserve existing time when changing date
        if (value) {
            date.setHours(value.getHours(), value.getMinutes())
        }
        onChange(date)
    }

    const handleTimeChange = (time: string) => {
        if (!time) return
        const [hours, minutes] = time.split(':').map(Number)
        const newDate = value ? new Date(value) : new Date()
        newDate.setHours(hours, minutes, 0, 0)
        onChange(newDate)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !value && 'text-muted-foreground',
                        className,
                    )}
                    disabled={disabled}
                >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {value ? (
                        format(value, 'dd/MM/yyyy HH:mm')
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                        if (minDate && date < minDate) return true
                        return false
                    }}
                    autoFocus
                />
                <div className="border-t p-3">
                    <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}

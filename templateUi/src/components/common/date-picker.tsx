import { AdvancedDatePicker } from './advanced-date-picker'

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
    const handleChange = (date: Date) => {
        onChange(date)
    }

    return (
        <AdvancedDatePicker
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            minDate={minDate}
            maxDate={maxDate}
            className={className}
            disabled={disabled}
        />
    )
}

'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getLunarInfoForMonth } from '@/lib/lunar-calendar'
import { cn } from '@/lib/utils'

interface AdvancedDatePickerProps {
  value?: Date
  onChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
  className?: string
}

const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const VIETNAMESE_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

export function AdvancedDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Chọn ngày...',
  disabled = false,
  className,
}: AdvancedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showLunar, setShowLunar] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [isOpen])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleSelectDate = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    if (onChange) onChange(selectedDate)
    setIsOpen(false)
  }

  const handleSelectToday = () => {
    const today = new Date()
    if (onChange) onChange(today)
    setCurrentDate(today)
    setIsOpen(false)
  }

  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const renderMonth = (monthOffset: number) => {
    const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
    const daysInMonth = getDaysInMonth(month)
    const firstDay = getFirstDayOfMonth(month)
    const lunarInfo = showLunar ? getLunarInfoForMonth(month.getFullYear(), month.getMonth() + 1) : null
    const days: (number | null)[] = Array(firstDay).fill(null)

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return (
      <div key={monthOffset} className="flex-1 min-w-64">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {month.getFullYear() === new Date().getFullYear()
              ? VIETNAMESE_MONTHS[month.getMonth()]
              : `${VIETNAMESE_MONTHS[month.getMonth()]}, ${month.getFullYear()}`}
          </h3>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {VIETNAMESE_DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isToday = day === new Date().getDate() &&
              month.getMonth() === new Date().getMonth() &&
              month.getFullYear() === new Date().getFullYear()

            const isSelected = day === value?.getDate() &&
              month.getMonth() === value?.getMonth() &&
              month.getFullYear() === value?.getFullYear()

            const isDisabled = day === null ||
              (minDate && new Date(month.getFullYear(), month.getMonth(), day) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) ||
              (maxDate && new Date(month.getFullYear(), month.getMonth(), day) > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()))

            const lunarDate = day && lunarInfo ? lunarInfo.get(day) : null

            return (
              <button
                key={index}
                onClick={() => day && !isDisabled && handleSelectDate(day)}
                disabled={isDisabled}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors relative',
                  day === null && 'invisible',
                  isSelected && 'bg-yellow-400 text-gray-900 font-bold shadow-md',
                  !isSelected && day && 'bg-gray-50 text-gray-900 hover:bg-gray-100',
                  isToday && !isSelected && 'border-2 border-yellow-400',
                  isDisabled && 'text-gray-300 cursor-not-allowed hover:bg-gray-50'
                )}
              >
                <span>{day}</span>
                {lunarDate && (
                  <span className="text-[10px] leading-none text-gray-500/80 absolute bottom-0 left-1/2 -translate-x-1/2">
                    {lunarDate.split('/')[0]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setCurrentDate(value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date())
          setIsOpen((prev) => !prev)
        }}
        className={cn(
          'w-full justify-start text-left font-normal h-11 px-4 rounded-lg border border-border hover:border-primary/40 hover:bg-white transition-all duration-200',
          !value && 'text-muted-foreground bg-background',
          value && 'border-primary/40 bg-primary/10 text-foreground font-medium',
          className,
        )}
        disabled={disabled}
      >
        <Calendar className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{value ? formatDisplayDate(value) : placeholder}</span>
      </Button>

      {isOpen && (
          <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-[9999] w-[min(94vw,760px)] -translate-x-1/2 rounded-xl border border-border bg-background p-4 shadow-2xl md:p-6">
              <div className="mb-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={handleSelectToday}
                  >
                    Hôm nay
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {renderMonth(0)}
                {renderMonth(1)}
              </div>

              <div className="flex items-center justify-center border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lunar-toggle"
                    checked={showLunar}
                    onChange={(e) => setShowLunar(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <label htmlFor="lunar-toggle" className="cursor-pointer text-sm font-medium text-foreground">
                    Hiển thị lịch âm
                  </label>
                </div>
              </div>
          </div>
      )}
    </div>
  )
}

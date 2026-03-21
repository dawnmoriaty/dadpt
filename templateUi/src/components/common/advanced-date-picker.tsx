'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getLunarInfoForMonth } from '@/lib/lunar-calendar'

interface AdvancedDatePickerProps {
  value?: Date
  onChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
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
  disabled = false
}: AdvancedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(value || new Date())
  const [showLunar, setShowLunar] = useState(true)

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
              (minDate && new Date(month.getFullYear(), month.getMonth(), day) < minDate) ||
              (maxDate && new Date(month.getFullYear(), month.getMonth(), day) > maxDate)

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
                  <span className="text-xs text-gray-500 absolute bottom-1">{lunarDate.split('/')[0]}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start text-left font-normal h-11 px-4 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-white transition-all duration-200',
          !value && 'text-gray-500 bg-gray-50',
          value && 'border-gray-400 bg-yellow-50 text-gray-900 font-medium'
        )}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="truncate">
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </Button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 p-6 w-max">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleSelectToday}
              >
                Hôm nay
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Two-month calendar view */}
          <div className="flex gap-6 mb-4">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>

          {/* Lunar calendar toggle */}
          <div className="flex items-center justify-center pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lunar-toggle"
                checked={showLunar}
                onChange={(e) => setShowLunar(e.target.checked)}
                className="w-4 h-4 rounded accent-yellow-400"
              />
              <label
                htmlFor="lunar-toggle"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Hiển thị lịch âm
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Close on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

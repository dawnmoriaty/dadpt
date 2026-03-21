import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { SeatLayout } from '@/modules/trip'

interface SeatMapProps {
    layout: SeatLayout
    bookedSeats: string[]
    selectedSeats: string[]
    maxSeats: number
    onSelectionChange: (seats: string[]) => void
}

/**
 * Derive row number from a seat code like "A01" → 1, "B10" → 10
 */
function getRowNumber(seatCode: string): number {
    const match = seatCode.match(/^[A-Za-z]+(\d+)$/)
    return match ? parseInt(match[1], 10) : 0
}

/**
 * Derive column letter from a seat code like "A01" → "A", "B10" → "B"
 */
function getColumnLetter(seatCode: string): string {
    const match = seatCode.match(/^([A-Za-z]+)\d+$/)
    return match ? match[1] : ''
}

/**
 * Parse a seat code into its prefix (column letter) and number (row number).
 */
function parseSeatCode(code: string): { prefix: string; number: number } | null {
    const match = code.match(/^([A-Za-z]+)(\d+)$/)
    if (!match) return null
    return { prefix: match[1], number: parseInt(match[2], 10) }
}

/**
 * Check if a set of seat codes forms a valid same-row selection:
 * All seats must share the same row number (e.g. A01, B01, C01 — same physical row).
 */
function isSameRowSet(seatCodes: string[]): boolean {
    if (seatCodes.length <= 1) return true

    const parsed = seatCodes.map(parseSeatCode).filter(Boolean) as { prefix: string; number: number }[]
    if (parsed.length !== seatCodes.length) return false

    const baseNumber = parsed[0].number
    return parsed.every((p) => p.number === baseNumber)
}

/**
 * Check if adding a specific seat to the current selection would still be valid.
 */
function canAddSeat(seatCode: string, currentSelection: string[]): boolean {
    if (currentSelection.length === 0) return true
    return isSameRowSet([...currentSelection, seatCode])
}

/**
 * Build a grid: rows × columns from the layout data.
 * Returns Map<rowNumber, Map<columnLetter, seatCode | null>>
 */
function buildSeatGrid(
    layout: SeatLayout,
    floorSeats: string[],
) {
    const columnLetters = layout.columns.filter((c) => c !== '')
    const rows = new Map<number, Map<string, string | null>>()

    for (const seat of floorSeats) {
        const row = getRowNumber(seat)
        const col = getColumnLetter(seat)
        if (!rows.has(row)) {
            const rowMap = new Map<string, string | null>()
            for (const c of columnLetters) {
                rowMap.set(c, null)
            }
            rows.set(row, rowMap)
        }
        rows.get(row)!.set(col, seat)
    }

    return { rows, columnLetters }
}

/**
 * Split seats into floors for 2-floor buses.
 * Floor 1 (lower): rows 1..ceil(totalRows/2)
 * Floor 2 (upper): rows ceil(totalRows/2)+1..totalRows
 */
function splitByFloor(seats: string[], totalRows: number): [string[], string[]] {
    const midRow = Math.ceil(totalRows / 2)
    const floor1: string[] = []
    const floor2: string[] = []
    for (const seat of seats) {
        if (getRowNumber(seat) <= midRow) {
            floor1.push(seat)
        } else {
            floor2.push(seat)
        }
    }
    return [floor1, floor2]
}

function SeatButton({
    seatCode,
    status,
    layoutType,
    onClick,
}: {
    seatCode: string
    status: 'available' | 'selected' | 'booked' | 'disabled'
    layoutType: string
    onClick: () => void
}) {
    const isSleeper = layoutType === 'sleeper' || layoutType === 'limousine_cabin'
    const isLimousine = layoutType === 'limousine' || layoutType === 'limousine_cabin'

    return (
        <button
            type="button"
            disabled={status === 'booked' || status === 'disabled'}
            onClick={onClick}
            className={cn(
                'flex items-center justify-center border font-medium transition-all text-xs',
                // Size varies by type
                isSleeper
                    ? 'h-12 w-10 rounded-lg'
                    : isLimousine
                      ? 'h-11 w-11 rounded-xl'
                      : 'h-9 w-10 rounded-md',
                // Color by status
                status === 'booked' &&
                    'bg-muted text-muted-foreground/50 border-muted cursor-not-allowed line-through',
                status === 'disabled' &&
                    'bg-muted/50 text-muted-foreground/30 border-muted/50 cursor-not-allowed',
                status === 'available' &&
                    'bg-background border-border hover:border-primary hover:bg-primary/10 cursor-pointer',
                status === 'selected' &&
                    'bg-primary text-primary-foreground border-primary cursor-pointer',
            )}
        >
            {seatCode}
        </button>
    )
}

function FloorGrid({
    layout,
    seats,
    bookedSeats,
    selectedSeats,
    maxSeats,
    onSelectionChange,
}: {
    layout: SeatLayout
    seats: string[]
    bookedSeats: string[]
    selectedSeats: string[]
    maxSeats: number
    onSelectionChange: (seats: string[]) => void
}) {
    const { t } = useTranslation()
    const { rows } = buildSeatGrid(layout, seats)
    const sortedRowNumbers = Array.from(rows.keys()).sort((a, b) => a - b)

    // Build the column template including aisle gaps
    const columnTemplate = layout.columns.map((c) =>
        c === '' ? 'aisle' : c,
    )

    const handleSeatClick = (seatCode: string) => {
        const isSelected = selectedSeats.includes(seatCode)
        if (isSelected) {
            onSelectionChange(selectedSeats.filter((s) => s !== seatCode))
            return
        }

        if (selectedSeats.length >= maxSeats) {
            toast.error(t('booking.errorTooManySeats', { max: maxSeats }))
            return
        }

        const newSelection = [...selectedSeats, seatCode]
        if (!isSameRowSet(newSelection)) {
            toast.error(t('booking.errorSeatsNotSameRow'))
            return
        }

        onSelectionChange(newSelection)
    }

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Column headers */}
            <div className="flex gap-1 mb-1">
                {columnTemplate.map((col, idx) =>
                    col === 'aisle' ? (
                        <div key={`aisle-${idx}`} className="w-4" />
                    ) : (
                        <div
                            key={col}
                            className="h-6 w-10 flex items-center justify-center text-xs text-muted-foreground font-medium"
                        >
                            {col}
                        </div>
                    ),
                )}
            </div>

            {/* Seat rows */}
            {sortedRowNumbers.map((rowNum) => {
                const rowMap = rows.get(rowNum)!
                return (
                    <div key={rowNum} className="flex gap-1">
                        {columnTemplate.map((col, idx) => {
                            if (col === 'aisle') {
                                return <div key={`aisle-${idx}`} className="w-4" />
                            }
                            const seatCode = rowMap.get(col)
                            if (!seatCode) {
                                // Empty cell (no seat in this position)
                                return (
                                    <div
                                        key={`empty-${col}-${rowNum}`}
                                        className="h-9 w-10"
                                    />
                                )
                            }

                            const isBooked = bookedSeats.includes(seatCode)
                            const isSelected = selectedSeats.includes(seatCode)
                            const isDisabled =
                                !isBooked &&
                                !isSelected &&
                                selectedSeats.length > 0 &&
                                !canAddSeat(seatCode, selectedSeats)
                            const status = isBooked
                                ? 'booked'
                                : isSelected
                                  ? 'selected'
                                  : isDisabled
                                    ? 'disabled'
                                    : 'available'

                            return (
                                <SeatButton
                                    key={seatCode}
                                    seatCode={seatCode}
                                    status={status}
                                    layoutType={layout.type}
                                    onClick={() => handleSeatClick(seatCode)}
                                />
                            )
                        })}
                    </div>
                )
            })}
        </div>
    )
}

export function SeatMap({
    layout,
    bookedSeats,
    selectedSeats,
    maxSeats,
    onSelectionChange,
}: SeatMapProps) {
    const { t } = useTranslation()
    const hasMultipleFloors = (layout.floors ?? 1) > 1

    if (!hasMultipleFloors) {
        return (
            <div className="space-y-3">
                <SeatLegend />
                <FloorGrid
                    layout={layout}
                    seats={layout.seats}
                    bookedSeats={bookedSeats}
                    selectedSeats={selectedSeats}
                    maxSeats={maxSeats}
                    onSelectionChange={onSelectionChange}
                />
            </div>
        )
    }

    const [floor1Seats, floor2Seats] = splitByFloor(layout.seats, layout.rows)

    return (
        <div className="space-y-3">
            <SeatLegend />
            <Tabs defaultValue="floor-1" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="floor-1">
                        {t('booking.lowerFloor', { defaultValue: 'Tầng dưới' })}
                    </TabsTrigger>
                    <TabsTrigger value="floor-2">
                        {t('booking.upperFloor', { defaultValue: 'Tầng trên' })}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="floor-1" className="pt-2">
                    <FloorGrid
                        layout={layout}
                        seats={floor1Seats}
                        bookedSeats={bookedSeats}
                        selectedSeats={selectedSeats}
                        maxSeats={maxSeats}
                        onSelectionChange={onSelectionChange}
                    />
                </TabsContent>
                <TabsContent value="floor-2" className="pt-2">
                    <FloorGrid
                        layout={layout}
                        seats={floor2Seats}
                        bookedSeats={bookedSeats}
                        selectedSeats={selectedSeats}
                        maxSeats={maxSeats}
                        onSelectionChange={onSelectionChange}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function SeatLegend() {
    const { t } = useTranslation()
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded border border-border bg-background" />
                    <span>{t('booking.seatAvailable', { defaultValue: 'Còn trống' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-primary" />
                    <span>{t('booking.seatSelected', { defaultValue: 'Đang chọn' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-muted border border-muted" />
                    <span>{t('booking.seatBooked', { defaultValue: 'Đã đặt' })}</span>
                </div>
            </div>
            <p className="text-xs text-muted-foreground/80 italic">
                {t('booking.seatSameRowHint')}
            </p>
        </div>
    )
}

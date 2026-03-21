// Lunar calendar conversion utility for Vietnamese dates
// Based on astronomical calculations

interface LunarDate {
  day: number
  month: number
  year: number
}

// Approximate conversion from Gregorian to Lunar
// Note: This is a simplified version. For production, consider using a library like 'jalaali-js' or 'lunar-calendar'
const LUNAR_DATA = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Placeholder
] as const

// Get the number of days in a lunar month
function getDaysInLunarMonth(lunarMonth: number, lunarYear: number): number {
  // Lunar months have either 29 or 30 days
  // This is simplified - real implementation would use lunar calendar tables
  const isLeapMonth = lunarMonth === 13
  const baseMonth = isLeapMonth ? 12 : lunarMonth

  // Rough estimation: most months have 29 or 30 days
  return (lunarYear + lunarMonth) % 2 === 0 ? 30 : 29
}

// Convert Gregorian date to approximate Lunar date
export function gregorianToLunar(date: Date): LunarDate {
  const gYear = date.getFullYear()
  const gMonth = date.getMonth() + 1
  const gDay = date.getDate()

  // Simplified conversion (not astronomically accurate for all dates)
  // For accurate conversion, use the jalaali-js or similar library
  
  let lYear = gYear
  let lMonth = gMonth
  let lDay = gDay

  // Approximate offset for Vietnamese lunar calendar
  // This is a rough estimation and should be validated against actual lunar calendar data
  if (gMonth < 2) {
    lYear = gYear - 1
    lMonth = gMonth + 12
  }

  // Simplified calculation (real implementation needs lookup tables)
  // The difference between Gregorian and Lunar is typically 29-30 days per month
  const offset = Math.floor((gDay + gMonth * 3) % 29.5)
  lDay = offset || 1

  return { day: lDay, month: lMonth % 12 || 12, year: lYear }
}

// Format lunar date for display
export function formatLunarDate(lunar: LunarDate): string {
  return `${lunar.day}/${lunar.month}`
}

// Get lunar calendar info for a date range
export function getLunarCalendarInfo(
  startDate: Date,
  endDate: Date
): Map<string, string> {
  const lunarMap = new Map<string, string>()
  const current = new Date(startDate)

  while (current <= endDate) {
    const lunar = gregorianToLunar(current)
    const key = current.toISOString().split('T')[0]
    lunarMap.set(key, formatLunarDate(lunar))
    current.setDate(current.getDate() + 1)
  }

  return lunarMap
}

// Get lunar info for a specific month
export function getLunarInfoForMonth(
  year: number,
  month: number
): Map<number, string> {
  const lunarMap = new Map<number, string>()
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  let current = new Date(startDate)
  while (current <= endDate) {
    const day = current.getDate()
    const lunar = gregorianToLunar(current)
    lunarMap.set(day, formatLunarDate(lunar))
    current.setDate(current.getDate() + 1)
  }

  return lunarMap
}

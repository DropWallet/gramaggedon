import { format, addDays, setHours, setMinutes, isBefore, isAfter } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const UK_TIMEZONE = 'Europe/London'
const MORNING_GAME_HOUR = 9 // 9 AM UK time
const EVENING_GAME_HOUR = 18 // 6 PM UK time

/**
 * Get the next scheduled game time (morning or evening UK time)
 */
export function getNextGameTime(): Date {
  const now = new Date()
  const ukNow = utcToZonedTime(now, UK_TIMEZONE)
  
  // Get today's morning and evening game times in UK timezone
  const todayMorning = setMinutes(setHours(ukNow, MORNING_GAME_HOUR), 0)
  const todayEvening = setMinutes(setHours(ukNow, EVENING_GAME_HOUR), 0)
  
  // Convert to UTC for storage/comparison
  const todayMorningUtc = zonedTimeToUtc(todayMorning, UK_TIMEZONE)
  const todayEveningUtc = zonedTimeToUtc(todayEvening, UK_TIMEZONE)
  
  // Determine which game is next
  if (isBefore(now, todayMorningUtc)) {
    return todayMorningUtc
  } else if (isBefore(now, todayEveningUtc)) {
    return todayEveningUtc
  } else {
    // Next game is tomorrow morning
    const tomorrowMorning = addDays(todayMorningUtc, 1)
    return tomorrowMorning
  }
}

/**
 * Get the current battle number (increments daily)
 */
export function getBattleNumber(): number {
  // This is a placeholder - in production, this would be based on actual game start dates
  // For now, we'll use days since a fixed start date
  const startDate = new Date('2025-11-12')
  const now = new Date()
  const diffTime = now.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Format date for display (e.g., "12 November, 2025")
 */
export function formatGameDate(date: Date = new Date()): string {
  return format(date, 'd MMMM, yyyy')
}


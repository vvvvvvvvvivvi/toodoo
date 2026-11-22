import type { Circle, SettingsRecord } from '@/types/models'
import { localNowMinutes, localToday, parseTimeToMinutes } from '@/lib/utils/date'

// Invariant 11: a Circle needs closing once its day has ended — either it's
// a stale circle from a previous day, or it's today's circle and the local
// clock has passed the configured day-end time. Invariant 12: all "today"
// comparisons use local-timezone date/time, never UTC.
export function getCirclesNeedingClosure(
  circles: Circle[],
  settings: SettingsRecord,
  now: Date = new Date(),
): Circle[] {
  const today = localToday(now)
  const nowMinutes = localNowMinutes(now)
  const dayEndMinutes = parseTimeToMinutes(settings.dayEndTime)

  return circles.filter((c) => {
    if (c.state !== 'planning' && c.state !== 'active') return false
    if (c.date < today) return true
    if (c.date === today && nowMinutes >= dayEndMinutes) return true
    return false
  })
}

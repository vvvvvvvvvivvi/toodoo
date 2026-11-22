// Local-timezone date helpers (Invariant 12). Never use toISOString() for
// date-only comparisons — it converts to UTC and can shift the calendar day.

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function localToday(now: Date = new Date()): string {
  return localDateString(now)
}

export function localNowMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return localDateString(date)
}

// YYYY-MM-DD strings sort lexicographically the same as chronologically.
export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b
}

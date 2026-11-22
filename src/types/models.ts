export interface Task {
  id: string
  title: string
  estimateMinutes: number
  remainingMinutes: number
  deadline?: string // ISO date only, YYYY-MM-DD
  state: 'backlog' | 'planned' | 'completed'
  circleId?: string
  sortIndex: number
  createdAt: string // ISO datetime
  completedAt?: string
  splitFromId?: string
  tags?: string[]
}

export interface Circle {
  id: string
  date: string // YYYY-MM-DD
  stomachMinutes: number
  state: 'planning' | 'active' | 'cleanPlate' | 'abandoned' | 'closed'
  savedAt?: string
  endedAt?: string
}

export interface Poo {
  id: string
  size: 'small' | 'medium' | 'large'
  earnedAt: string
  taskId: string
}

export interface DayReflection {
  date: string // YYYY-MM-DD
  mood?: 'bad' | 'okay' | 'good'
  circleIds: string[]
}

export interface SettingsRecord {
  id: 'singleton'
  dayEndTime: string // "HH:MM", local time
  defaultStomachMinutes: number
  notificationsEnabled: boolean
  // Invariant 9: Fill My Day is dismissible per-day. Not part of the spec's
  // core data model — piggybacked onto the settings singleton rather than
  // inventing a new table for one date string.
  fillMyDayDismissedDate: string | null
  // Must survive a reload — the intro cards should show exactly once ever,
  // not on every boot. Same reasoning as fillMyDayDismissedDate above.
  firstRunComplete: boolean
}

// Derived, never persisted.
export type FoodSize = 'snack' | 'meal' | 'feast'
export type PooSize = Poo['size']

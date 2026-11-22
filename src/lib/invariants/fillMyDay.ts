import type { Task } from '@/types/models'

function compareForFillMyDay(a: Task, b: Task): number {
  // Nearest deadline first; tasks with no deadline sort after any that have one.
  if (a.deadline && b.deadline) {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1
  } else if (a.deadline && !b.deadline) {
    return -1
  } else if (!a.deadline && b.deadline) {
    return 1
  }
  // Tie-break: oldest createdAt first.
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id.localeCompare(b.id)
}

// Invariant 9: suggestions for filling the remaining gap in an underfilled
// Circle. Ordered by nearest deadline, then oldest createdAt; filtered to
// tasks that fit the gap where that filter still leaves something to show —
// otherwise fall back to the full sorted backlog so the tray is never empty
// just because nothing fits perfectly.
export function getFillMyDaySuggestions(backlog: Task[], gapMinutes: number): Task[] {
  if (gapMinutes <= 0) return []
  const sorted = [...backlog].sort(compareForFillMyDay)
  const fitting = sorted.filter((t) => t.remainingMinutes <= gapMinutes)
  return fitting.length > 0 ? fitting : sorted
}

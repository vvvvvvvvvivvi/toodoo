import type { Circle, Task } from '@/types/models'

export function computePlannedMinutes(circleId: string, tasks: Task[]): number {
  return tasks
    .filter((t) => t.circleId === circleId && t.state === 'planned')
    .reduce((sum, t) => sum + t.remainingMinutes, 0)
}

export type CapacityValidation = { ok: true } | { ok: false; overflowMinutes: number }

// Invariant 1: a Circle's planned minutes may never exceed its stomachMinutes.
export function validateCircleCapacity(circle: Circle, tasks: Task[]): CapacityValidation {
  const planned = computePlannedMinutes(circle.id, tasks)
  if (planned <= circle.stomachMinutes) return { ok: true }
  return { ok: false, overflowMinutes: planned - circle.stomachMinutes }
}

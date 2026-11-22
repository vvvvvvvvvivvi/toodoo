import type { Circle, Task } from '@/types/models'
import { isOnOrBefore } from '@/lib/utils/date'

export type CircleEndReason = 'cleanPlate' | 'abandoned' | 'closed'

// Invariant 8: when a Circle ends, every incomplete task in it returns to
// backlog with its remainingMinutes intact — nothing is silently deleted,
// and this applies uniformly whether or not the task was locked. Locked
// tasks are recaptured by the very next autoPlanDueTasks pass (see below),
// which is what produces Invariant 7's "requeue" behavior without a 4th
// task state or a special code path.
export function endCircle(
  circle: Circle,
  tasks: Task[],
  reason: CircleEndReason,
  now: string,
): { circle: Circle; releasedTasks: Task[] } {
  const incomplete = tasks.filter((t) => t.circleId === circle.id && t.state === 'planned')
  const releasedTasks = incomplete.map((t) => ({ ...t, state: 'backlog' as const, circleId: undefined }))
  const updatedCircle: Circle = { ...circle, state: reason, endedAt: now }
  return { circle: updatedCircle, releasedTasks }
}

export function isCleanPlate(circleId: string, tasks: Task[]): boolean {
  return tasks.filter((t) => t.circleId === circleId && t.state === 'planned').length === 0
}

// Invariant 2: any backlog task whose deadline has arrived is auto-planned
// into the day's open circle and becomes locked (isLocked derives this from
// state==='planned' + deadline<=today). System transition — always commits,
// even if it pushes the circle over capacity (Invariant 3 then applies).
export function autoPlanDueTasks(today: string, tasks: Task[], openCircle: Circle | undefined): Task[] {
  if (!openCircle) return tasks
  return tasks.map((t) =>
    t.state === 'backlog' && !!t.deadline && isOnOrBefore(t.deadline, today)
      ? { ...t, state: 'planned' as const, circleId: openCircle.id }
      : t,
  )
}

// Invariant 10: at most one Circle may be in planning/active state at a time.
export function canCreateNewCircle(circles: Circle[]): boolean {
  return !circles.some((c) => c.state === 'planning' || c.state === 'active')
}

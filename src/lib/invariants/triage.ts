import type { Circle, Task } from '@/types/models'
import { isLocked } from '@/lib/invariants/lock'
import { MIN_ESTIMATE_MINUTES } from '@/lib/invariants/sizeThresholds'

export type TriageOptionKind =
  | 'split'
  | 'returnToBacklog'
  | 'shrinkEstimate'
  | 'delete'
  | 'moveDeadline'
  | 'growStomach'

export interface TriageTarget {
  taskId: string
  suggestedSplitMinutes?: number
  maxShrinkMinutes?: number
}

export interface TriageOptionGroup {
  kind: TriageOptionKind
  targets: TriageTarget[]
  suggestedStomachMinutes?: number
}

function plannedTasksIn(circleId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.circleId === circleId && t.state === 'planned')
}

function pickSplitTarget(candidates: Task[], overflowMinutes: number): Task | undefined {
  return candidates
    .filter((t) => t.remainingMinutes > overflowMinutes)
    .sort((a, b) => {
      if (b.remainingMinutes !== a.remainingMinutes) return b.remainingMinutes - a.remainingMinutes
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
      return a.id.localeCompare(b.id)
    })[0]
}

// Invariants 3 & 4: the ordered triage resolution options for an overflowing Circle.
export function getTriageOptions(
  circle: Circle,
  tasks: Task[],
  overflowMinutes: number,
  today: string,
): TriageOptionGroup[] {
  const planned = plannedTasksIn(circle.id, tasks)
  const locked = planned.filter((t) => isLocked(t, today))
  const unlocked = planned.filter((t) => !isLocked(t, today))
  const lockedMinutes = locked.reduce((sum, t) => sum + t.remainingMinutes, 0)

  // Invariant 3: locked tasks alone already blow the budget — only these
  // three resolutions are offered, since unlocked tasks can't help.
  if (lockedMinutes > circle.stomachMinutes) {
    return [
      { kind: 'moveDeadline', targets: locked.map((t) => ({ taskId: t.id })) },
      {
        kind: 'shrinkEstimate',
        targets: locked.map((t) => ({
          taskId: t.id,
          maxShrinkMinutes: Math.max(0, t.remainingMinutes - MIN_ESTIMATE_MINUTES),
        })),
      },
      { kind: 'growStomach', targets: [], suggestedStomachMinutes: lockedMinutes },
    ]
  }

  // Invariant 4: full ordered set.
  const splitTarget = pickSplitTarget(unlocked, overflowMinutes)

  return [
    {
      kind: 'split',
      targets: splitTarget ? [{ taskId: splitTarget.id, suggestedSplitMinutes: overflowMinutes }] : [],
    },
    { kind: 'returnToBacklog', targets: unlocked.map((t) => ({ taskId: t.id })) },
    {
      kind: 'shrinkEstimate',
      targets: unlocked.map((t) => ({
        taskId: t.id,
        maxShrinkMinutes: Math.max(0, t.remainingMinutes - MIN_ESTIMATE_MINUTES),
      })),
    },
    { kind: 'delete', targets: unlocked.map((t) => ({ taskId: t.id })) },
    { kind: 'moveDeadline', targets: locked.map((t) => ({ taskId: t.id })) },
  ]
}

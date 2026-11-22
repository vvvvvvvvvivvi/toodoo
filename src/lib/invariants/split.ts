import type { Task } from '@/types/models'
import { newId } from '@/lib/utils/id'

// Invariant 5: a split produces two independent sibling tasks, no
// parent/child relationship — lineage is flat via splitFromId on both.
// Sibling A keeps (remaining - overflow) minutes and stays planned in the
// same circle. Sibling B gets the overflow, goes to backlog. Each sibling's
// estimateMinutes is RESET to its own portion, not inherited from the
// original, so each earns its own poo sized correctly on completion.
export function splitTask(original: Task, overflowMinutes: number, now: string): [Task, Task] {
  if (overflowMinutes <= 0 || overflowMinutes >= original.remainingMinutes) {
    throw new Error('overflowMinutes must be strictly between 0 and remainingMinutes')
  }

  const siblingAMinutes = original.remainingMinutes - overflowMinutes
  const siblingA: Task = {
    ...original,
    id: newId(),
    estimateMinutes: siblingAMinutes,
    remainingMinutes: siblingAMinutes,
    state: 'planned',
    circleId: original.circleId,
    splitFromId: original.id,
    createdAt: now,
    completedAt: undefined,
  }

  const siblingB: Task = {
    ...original,
    id: newId(),
    estimateMinutes: overflowMinutes,
    remainingMinutes: overflowMinutes,
    state: 'backlog',
    circleId: undefined,
    splitFromId: original.id,
    createdAt: now,
    completedAt: undefined,
  }

  return [siblingA, siblingB]
}

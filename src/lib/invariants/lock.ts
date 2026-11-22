import type { Task } from '@/types/models'
import { isOnOrBefore } from '@/lib/utils/date'

// Invariant 2: a task is locked while it's planned AND its deadline has
// arrived. The only way to unlock it is to move the deadline out — there is
// no separate "locked" field, this is purely derived.
export function isLocked(task: Task, today: string): boolean {
  return task.state === 'planned' && !!task.deadline && isOnOrBefore(task.deadline, today)
}

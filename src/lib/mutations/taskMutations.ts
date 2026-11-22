import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { usePooStore } from '@/stores/usePooStore'
import { isLocked } from '@/lib/invariants/lock'
import { getPooSize } from '@/lib/invariants/poo'
import { isCleanPlate } from '@/lib/invariants/circleLifecycle'
import { newId } from '@/lib/utils/id'
import { localToday } from '@/lib/utils/date'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import type { Circle, Poo, Task } from '@/types/models'

function requireTask(taskId: string): Task {
  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)
  return task
}

// Invariant 2 holds continuously, not just at circle-creation time: any
// backlog task that becomes due (deadline <= today) while a circle is
// already open must be auto-planted and locked immediately — capturing a
// same-day task, or editing one's deadline to today, shouldn't have to wait
// for the next circle to pick it up. `createCircle`'s autoPlanDueTasks
// handles the circle-creation moment; this covers every moment after.
function autoPlantIfDueToday(task: Task, today: string = localToday()): Task {
  if (task.state !== 'backlog' || !task.deadline || task.deadline > today) return task
  const openCircle = useCircleStore.getState().circles.find((c) => c.state === 'planning' || c.state === 'active')
  if (!openCircle) return task
  return { ...task, state: 'planned', circleId: openCircle.id }
}

export interface AddTaskInput {
  title: string
  estimateMinutes: number
  deadline?: string
  tags?: string[]
}

// Backlog capture: a brand-new task always starts with remainingMinutes ===
// estimateMinutes, since nothing has nibbled at it yet.
export async function addTask(
  input: AddTaskInput,
  now: string = new Date().toISOString(),
  today: string = localToday(),
): Promise<Task> {
  const title = input.title.trim()
  if (!title) throw new Error('Task title cannot be empty')
  if (input.estimateMinutes <= 0) throw new Error('estimateMinutes must be positive')

  const tasks = useTaskStore.getState().tasks
  const maxSortIndex = tasks.reduce((max, t) => Math.max(max, t.sortIndex), -1)

  const task: Task = autoPlantIfDueToday(
    {
      id: newId(),
      title,
      estimateMinutes: input.estimateMinutes,
      remainingMinutes: input.estimateMinutes,
      deadline: input.deadline,
      tags: input.tags,
      state: 'backlog',
      sortIndex: maxSortIndex + 1,
      createdAt: now,
    },
    today,
  )

  await db.tasks.put(task)
  useTaskStore.getState().setAll([...tasks, task])
  return task
}

export interface EditBacklogTaskInput {
  title: string
  estimateMinutes: number
  deadline?: string
  tags?: string[]
}

// Editing is scoped to backlog tasks only — a planned/locked task's estimate
// changes through the capacity-aware paths (attemptCapacityMutation /
// shrinkEstimateDirect) instead, since those need to re-check Invariant 1.
export async function editBacklogTask(
  taskId: string,
  input: EditBacklogTaskInput,
  today: string = localToday(),
): Promise<void> {
  const task = requireTask(taskId)
  if (task.state !== 'backlog') throw new Error('editBacklogTask only applies to backlog tasks')

  const title = input.title.trim()
  if (!title) throw new Error('Task title cannot be empty')
  if (input.estimateMinutes <= 0) throw new Error('estimateMinutes must be positive')

  const updated: Task = autoPlantIfDueToday(
    {
      ...task,
      title,
      estimateMinutes: input.estimateMinutes,
      remainingMinutes: input.estimateMinutes,
      deadline: input.deadline,
      tags: input.tags,
    },
    today,
  )

  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))
}

// Monotonic-decreasing direct edit — never increases remainingMinutes, so it
// bypasses attemptCapacityMutation's re-validation (Phase-1 decision #5).
export async function nibbleTask(taskId: string, minutes: number): Promise<void> {
  if (minutes <= 0) throw new Error('nibble minutes must be positive')
  const task = requireTask(taskId)
  const updated: Task = { ...task, remainingMinutes: Math.max(0, task.remainingMinutes - minutes) }

  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))
}

// Invariant 6: a poo is created iff a task transitions to completed, sized by
// the task's ORIGINAL estimateMinutes. Invariant 7: completing the last
// planned task in a Circle sets it to cleanPlate.
export async function completeTask(
  taskId: string,
  now: string = new Date().toISOString(),
): Promise<{ poo: Poo; cleanPlate: boolean }> {
  const task = requireTask(taskId)
  const completedTask: Task = { ...task, state: 'completed', remainingMinutes: 0, completedAt: now }
  const poo: Poo = { id: newId(), size: getPooSize(task.estimateMinutes), earnedAt: now, taskId: task.id }

  const tasks = useTaskStore.getState().tasks
  const nextTasks = tasks.map((t) => (t.id === taskId ? completedTask : t))

  let updatedCircle: Circle | undefined
  if (task.circleId) {
    const circle = useCircleStore.getState().circles.find((c) => c.id === task.circleId)
    if (circle && isCleanPlate(circle.id, nextTasks)) {
      updatedCircle = { ...circle, state: 'cleanPlate', endedAt: now }
    }
  }

  await db.transaction('rw', db.tasks, db.poos, db.circles, async () => {
    await db.tasks.put(completedTask)
    await db.poos.put(poo)
    if (updatedCircle) await db.circles.put(updatedCircle)
  })

  useTaskStore.getState().setAll(nextTasks)
  usePooStore.getState().setAll([...usePooStore.getState().poos, poo])
  if (updatedCircle) {
    const circle = updatedCircle
    useCircleStore.getState().setAll(useCircleStore.getState().circles.map((c) => (c.id === circle.id ? circle : c)))
  }

  return { poo, cleanPlate: !!updatedCircle }
}

// Invariant 2: locked tasks can never be returned to backlog.
export async function returnToBacklog(taskId: string, today: string = localToday()): Promise<void> {
  const task = requireTask(taskId)
  if (isLocked(task, today)) throw new Error('Cannot return a locked task to backlog')

  const updated: Task = { ...task, state: 'backlog', circleId: undefined }
  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))
}

// Invariant 2: locked tasks can never be deleted.
export async function deleteTask(taskId: string, today: string = localToday()): Promise<void> {
  const task = requireTask(taskId)
  if (isLocked(task, today)) throw new Error('Cannot delete a locked task')

  await db.tasks.delete(taskId)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.filter((t) => t.id !== taskId))
}

// Monotonic-decreasing direct edit — bypasses attemptCapacityMutation for the
// same reason nibbleTask does.
export async function shrinkEstimateDirect(taskId: string, newEstimateMinutes: number): Promise<void> {
  const task = requireTask(taskId)
  if (newEstimateMinutes < 0) throw new Error('estimate cannot be negative')
  if (newEstimateMinutes >= task.estimateMinutes) {
    throw new Error('shrinkEstimateDirect must strictly decrease the estimate')
  }

  const delta = task.estimateMinutes - newEstimateMinutes
  const updated: Task = {
    ...task,
    estimateMinutes: newEstimateMinutes,
    remainingMinutes: Math.max(0, task.remainingMinutes - delta),
  }
  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))
}

// Invariant 2: moving a deadline out is the only way to unlock a locked task.
// (Moving it IN, for a backlog task, is the flip side — autoPlantIfDueToday
// picks that up immediately too, e.g. pinToTomorrow won't trigger it since
// tomorrow isn't due yet, but a deadline edited straight to today will.)
export async function updateTaskDeadline(
  taskId: string,
  deadline: string | undefined,
  today: string = localToday(),
): Promise<void> {
  const task = requireTask(taskId)
  const updated: Task = autoPlantIfDueToday({ ...task, deadline }, today)
  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))
}

export interface EditPlannedTaskInput {
  title: string
  estimateMinutes: number
  deadline?: string
  tags?: string[]
}

// Editing a task that's already planned (possibly locked) on the Today
// screen. Title/tags/deadline are direct edits — Invariant 2 only restricts
// delete/return-to-backlog for locked tasks, not edits, and Invariant 3
// explicitly allows shrinking or moving the deadline of a locked task. An
// estimate change is delta'd through the same capacity-aware paths as
// everywhere else: growing may open Triage (Invariant 1), shrinking is
// always safe.
export async function editPlannedTask(
  circleId: string,
  taskId: string,
  input: EditPlannedTaskInput,
): Promise<void> {
  const task = requireTask(taskId)
  const title = input.title.trim()
  if (!title) throw new Error('Task title cannot be empty')
  if (input.estimateMinutes <= 0) throw new Error('estimateMinutes must be positive')

  const updated: Task = { ...task, title, tags: input.tags, deadline: input.deadline }
  await db.tasks.put(updated)
  useTaskStore.getState().setAll(useTaskStore.getState().tasks.map((t) => (t.id === taskId ? updated : t)))

  const delta = input.estimateMinutes - task.estimateMinutes
  if (delta > 0) {
    await attemptCapacityMutation({ kind: 'growEstimate', circleId, taskId, deltaMinutes: delta })
  } else if (delta < 0) {
    await shrinkEstimateDirect(taskId, input.estimateMinutes)
  }
}

// Today screen drag-reorder: persists a new sortIndex ordering for the
// planned tasks of one circle. Purely cosmetic ordering, no capacity impact,
// so it never goes through attemptCapacityMutation.
export async function reorderPlannedTasks(circleId: string, orderedTaskIds: string[]): Promise<void> {
  const indexById = new Map(orderedTaskIds.map((id, index) => [id, index]))
  const tasks = useTaskStore.getState().tasks
  const nextTasks = tasks.map((t) =>
    t.circleId === circleId && t.state === 'planned' && indexById.has(t.id)
      ? { ...t, sortIndex: indexById.get(t.id)! }
      : t,
  )
  const toPersist = nextTasks.filter(
    (t) => t.circleId === circleId && t.state === 'planned' && indexById.has(t.id),
  )

  await db.tasks.bulkPut(toPersist)
  useTaskStore.getState().setAll(nextTasks)
}

import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { validateCircleCapacity } from '@/lib/invariants/capacity'
import { splitTask } from '@/lib/invariants/split'
import { localToday } from '@/lib/utils/date'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import { deleteTask, returnToBacklog, shrinkEstimateDirect, updateTaskDeadline } from '@/lib/mutations/taskMutations'
import type { Circle } from '@/types/models'

// Triage is iterative: after any single resolution, re-check whether the
// circle is back within capacity. If the triage was opened for a specific
// blocked mutation, replay that exact mutation — attemptCapacityMutation
// re-validates and either commits + we close the sheet, or it's still
// blocked and re-opens triage itself with the fresh overflow amount. If
// triage had no pending mutation (e.g. a proactive locked-only-overflow
// banner), just re-check the circle directly.
async function afterTriageResolution(circleId: string): Promise<void> {
  const triageCtx = useUIStore.getState().triage

  if (triageCtx?.pendingRequest) {
    const outcome = await attemptCapacityMutation(triageCtx.pendingRequest)
    if (outcome.status === 'committed') {
      useUIStore.getState().closeTriage()
    }
    return
  }

  const circle = useCircleStore.getState().circles.find((c) => c.id === circleId)
  if (!circle) {
    useUIStore.getState().closeTriage()
    return
  }

  const validation = validateCircleCapacity(circle, useTaskStore.getState().tasks)
  if (validation.ok) {
    useUIStore.getState().closeTriage()
  } else {
    useUIStore.getState().openTriage({ circleId, overflowMinutes: validation.overflowMinutes })
  }
}

// Invariant 5: split resolution — deletes the original, inserts two flat siblings.
export async function resolveSplit(
  circleId: string,
  taskId: string,
  splitMinutes: number,
  now: string = new Date().toISOString(),
): Promise<void> {
  const tasks = useTaskStore.getState().tasks
  const original = tasks.find((t) => t.id === taskId)
  if (!original) throw new Error(`Task ${taskId} not found`)

  const [siblingA, siblingB] = splitTask(original, splitMinutes, now)
  const nextTasks = tasks.filter((t) => t.id !== taskId).concat(siblingA, siblingB)

  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.delete(taskId)
    await db.tasks.bulkPut([siblingA, siblingB])
  })
  useTaskStore.getState().setAll(nextTasks)

  await afterTriageResolution(circleId)
}

export async function resolveReturnToBacklog(
  circleId: string,
  taskId: string,
  today: string = localToday(),
): Promise<void> {
  await returnToBacklog(taskId, today)
  await afterTriageResolution(circleId)
}

export async function resolveShrink(circleId: string, taskId: string, newEstimateMinutes: number): Promise<void> {
  await shrinkEstimateDirect(taskId, newEstimateMinutes)
  await afterTriageResolution(circleId)
}

export async function resolveDelete(circleId: string, taskId: string, today: string = localToday()): Promise<void> {
  await deleteTask(taskId, today)
  await afterTriageResolution(circleId)
}

// Locked-tasks-only resolution (Invariant 3) and general unlock mechanism (Invariant 2).
export async function resolveMoveDeadline(
  circleId: string,
  taskId: string,
  deadline: string | undefined,
): Promise<void> {
  await updateTaskDeadline(taskId, deadline)
  await afterTriageResolution(circleId)
}

// Growing the stomach only relieves overflow, never causes it — always commits directly.
export async function resolveGrowStomach(circleId: string, newStomachMinutes: number): Promise<void> {
  const circles = useCircleStore.getState().circles
  const circle = circles.find((c) => c.id === circleId)
  if (!circle) throw new Error(`Circle ${circleId} not found`)

  const updated: Circle = { ...circle, stomachMinutes: newStomachMinutes }
  await db.circles.put(updated)
  useCircleStore.getState().setAll(circles.map((c) => (c.id === circleId ? updated : c)))

  await afterTriageResolution(circleId)
}

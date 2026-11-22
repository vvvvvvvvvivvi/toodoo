import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { validateCircleCapacity } from '@/lib/invariants/capacity'
import { autoPlanDueTasks, canCreateNewCircle } from '@/lib/invariants/circleLifecycle'
import { newId } from '@/lib/utils/id'
import { requestNotificationPermission } from '@/lib/mutations/settingsMutations'
import type { Circle, Task } from '@/types/models'

export type CapacityMutationRequest =
  | { kind: 'addTaskToCircle'; circleId: string; taskId: string }
  | { kind: 'growEstimate'; circleId: string; taskId: string; deltaMinutes: number }
  | { kind: 'shrinkStomach'; circleId: string; newStomachMinutes: number }
  | { kind: 'feedTheGoose'; circleId: string }

export type MutationOutcome = { status: 'committed' } | { status: 'blocked'; overflowMinutes: number; circleId: string }

function applyCapacityRequest(
  req: CapacityMutationRequest,
  tasks: Task[],
  circle: Circle,
): { tasks: Task[]; circle: Circle } {
  switch (req.kind) {
    case 'addTaskToCircle':
      return {
        circle,
        tasks: tasks.map((t) =>
          t.id === req.taskId ? { ...t, state: 'planned' as const, circleId: req.circleId } : t,
        ),
      }
    case 'growEstimate':
      return {
        circle,
        tasks: tasks.map((t) =>
          t.id === req.taskId
            ? {
                ...t,
                estimateMinutes: t.estimateMinutes + req.deltaMinutes,
                remainingMinutes: t.remainingMinutes + req.deltaMinutes,
              }
            : t,
        ),
      }
    case 'shrinkStomach':
      return { tasks, circle: { ...circle, stomachMinutes: req.newStomachMinutes } }
    case 'feedTheGoose':
      return { tasks, circle }
  }
}

// Invariant 1: the single choke point every capacity-affecting mutation goes
// through. Computes the next state, validates it, and only commits to Dexie
// + the stores if it's within capacity — otherwise opens triage and leaves
// the current state untouched (compute -> validate -> commit, no rollback).
export async function attemptCapacityMutation(
  req: CapacityMutationRequest,
  now: string = new Date().toISOString(),
): Promise<MutationOutcome> {
  const tasks = useTaskStore.getState().tasks
  const circles = useCircleStore.getState().circles
  const circle = circles.find((c) => c.id === req.circleId)
  if (!circle) throw new Error(`Circle ${req.circleId} not found`)

  const { tasks: nextTasks, circle: transformedCircle } = applyCapacityRequest(req, tasks, circle)
  const validation = validateCircleCapacity(transformedCircle, nextTasks)

  if (!validation.ok) {
    useUIStore.getState().openTriage({
      circleId: req.circleId,
      overflowMinutes: validation.overflowMinutes,
      pendingRequest: req,
    })
    return { status: 'blocked', overflowMinutes: validation.overflowMinutes, circleId: req.circleId }
  }

  const finalCircle: Circle =
    req.kind === 'feedTheGoose' ? { ...transformedCircle, state: 'active', savedAt: now } : transformedCircle

  await db.transaction('rw', db.tasks, db.circles, async () => {
    await db.tasks.bulkPut(nextTasks)
    await db.circles.put(finalCircle)
  })

  useTaskStore.getState().setAll(nextTasks)
  useCircleStore.getState().setAll(circles.map((c) => (c.id === finalCircle.id ? finalCircle : c)))

  return { status: 'committed' }
}

// First-run: Notification permission is requested only after the first ever
// successful "Feed the Goose", never on load. Detected by checking whether
// any circle had already been saved before this call commits.
export async function feedTheGoose(
  circleId: string,
  now: string = new Date().toISOString(),
): Promise<MutationOutcome> {
  const isFirstEverSave = !useCircleStore.getState().circles.some((c) => c.savedAt)
  const outcome = await attemptCapacityMutation({ kind: 'feedTheGoose', circleId }, now)

  if (outcome.status === 'committed' && isFirstEverSave) {
    await requestNotificationPermission()
  }

  return outcome
}

// Invariant 10 gate + Invariant 2: immediately auto-plants any already-due
// backlog tasks into the freshly created circle, then immediately attempts
// to activate it (no more manual "Feed the Goose" gate — capacity is
// already re-validated on every mutation via attemptCapacityMutation, so
// there's nothing this manual step was protecting). Happy path: the circle
// comes back `active`. If the auto-planted overdue tasks alone already
// overflow the stomach, this attempt is blocked and Triage opens
// immediately; resolving it replays and activates the circle automatically
// via attemptCapacityMutation's own pendingRequest mechanism.
export async function createCircle(date: string, stomachMinutes: number): Promise<Circle> {
  const circles = useCircleStore.getState().circles
  if (!canCreateNewCircle(circles)) {
    throw new Error('Cannot create a circle while one is already planning or active')
  }

  const circle: Circle = { id: newId(), date, stomachMinutes, state: 'planning' }
  const tasks = useTaskStore.getState().tasks
  const plantedTasks = autoPlanDueTasks(date, tasks, circle)

  await db.transaction('rw', db.tasks, db.circles, async () => {
    await db.tasks.bulkPut(plantedTasks)
    await db.circles.put(circle)
  })

  useTaskStore.getState().setAll(plantedTasks)
  useCircleStore.getState().setAll([...circles, circle])

  await feedTheGoose(circle.id)

  return useCircleStore.getState().circles.find((c) => c.id === circle.id) ?? circle
}

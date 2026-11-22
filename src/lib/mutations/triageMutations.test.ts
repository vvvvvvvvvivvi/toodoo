import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import {
  resolveDelete,
  resolveGrowStomach,
  resolveMoveDeadline,
  resolveReturnToBacklog,
  resolveShrink,
  resolveSplit,
} from '@/lib/mutations/triageMutations'
import type { Circle, Task } from '@/types/models'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 30,
    state: 'planned',
    circleId: 'c1',
    sortIndex: 0,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

async function seed(tasks: Task[], circles: Circle[]) {
  await db.tasks.bulkPut(tasks)
  await db.circles.bulkPut(circles)
  useTaskStore.getState().setAll(tasks)
  useCircleStore.getState().setAll(circles)
}

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useUIStore.setState({ triage: null })
})

describe('end-to-end: blocked mutation -> triage -> resolution replays the pending request', () => {
  it('returnToBacklog frees enough room for the originally-blocked addTaskToCircle to succeed', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'planning' }
    const alreadyPlanned = task({ id: 'A', remainingMinutes: 40 })
    const backlogTask = task({ id: 'B', remainingMinutes: 20, state: 'backlog', circleId: undefined })
    await seed([alreadyPlanned, backlogTask], [circle])

    const blocked = await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: 'c1', taskId: 'B' })
    expect(blocked).toEqual({ status: 'blocked', overflowMinutes: 10, circleId: 'c1' })
    expect(useUIStore.getState().triage?.pendingRequest).toEqual({
      kind: 'addTaskToCircle',
      circleId: 'c1',
      taskId: 'B',
    })

    await resolveReturnToBacklog('c1', 'A', '2026-07-13')

    expect(useUIStore.getState().triage).toBeNull() // pendingRequest replayed and committed
    const tasks = useTaskStore.getState().tasks
    expect(tasks.find((t) => t.id === 'A')?.state).toBe('backlog')
    expect(tasks.find((t) => t.id === 'B')?.state).toBe('planned')
    expect(tasks.find((t) => t.id === 'B')?.circleId).toBe('c1')
  })

  it('re-opens triage with a fresh overflow amount if the resolution was not enough', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'planning' }
    const alreadyPlanned = task({ id: 'A', estimateMinutes: 45, remainingMinutes: 45 })
    const backlogTask = task({ id: 'B', remainingMinutes: 20, state: 'backlog', circleId: undefined })
    await seed([alreadyPlanned, backlogTask], [circle])

    await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: 'c1', taskId: 'B' })
    // Shrinking A by only 5 minutes isn't enough to fit B's 20 minutes.
    await resolveShrink('c1', 'A', 40)

    expect(useUIStore.getState().triage).not.toBeNull()
    expect(useUIStore.getState().triage?.pendingRequest).toEqual({
      kind: 'addTaskToCircle',
      circleId: 'c1',
      taskId: 'B',
    })
  })
})

describe('resolveSplit (Invariant 5)', () => {
  it('splits the overflowing task into two siblings and closes triage once capacity is restored', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'active' }
    const big = task({ id: 'big', remainingMinutes: 70 })
    await seed([big], [circle])
    useUIStore.getState().openTriage({ circleId: 'c1', overflowMinutes: 20 })

    await resolveSplit('c1', 'big', 20, '2026-07-13T10:00:00.000Z')

    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(2)
    expect(tasks.find((t) => t.state === 'planned')?.remainingMinutes).toBe(50)
    expect(tasks.find((t) => t.state === 'backlog')?.remainingMinutes).toBe(20)
    expect(useUIStore.getState().triage).toBeNull()
  })
})

describe('resolveDelete', () => {
  it('deletes the task and closes triage once back within capacity', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'active' }
    await seed([task({ id: 't1', remainingMinutes: 70 })], [circle])
    useUIStore.getState().openTriage({ circleId: 'c1', overflowMinutes: 20 })

    await resolveDelete('c1', 't1', '2026-07-13')

    expect(useTaskStore.getState().tasks).toEqual([])
    expect(useUIStore.getState().triage).toBeNull()
  })
})

describe('resolveMoveDeadline + resolveReturnToBacklog (Invariant 3 restricted flow)', () => {
  it('moving a locked task\'s deadline out does not by itself fix overflow, but then unlocks it for a normal resolution', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'active' }
    const locked = task({ id: 'locked', remainingMinutes: 70, deadline: '2026-07-13' })
    await seed([locked], [circle])
    useUIStore.getState().openTriage({ circleId: 'c1', overflowMinutes: 20 })

    await resolveMoveDeadline('c1', 'locked', '2026-08-01')

    // Still overflowing — moving the deadline doesn't shed minutes.
    expect(useUIStore.getState().triage).not.toBeNull()
    expect(useUIStore.getState().triage?.overflowMinutes).toBe(20)

    // But the task is unlocked now, so a normal return-to-backlog can proceed.
    await resolveReturnToBacklog('c1', 'locked', '2026-07-13')
    expect(useUIStore.getState().triage).toBeNull()
    expect(useTaskStore.getState().tasks[0].state).toBe('backlog')
  })
})

describe('resolveGrowStomach', () => {
  it('grows the stomach and closes triage without touching any tasks', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'active' }
    const locked = task({ id: 'locked', remainingMinutes: 70, deadline: '2026-07-13' })
    await seed([locked], [circle])
    useUIStore.getState().openTriage({ circleId: 'c1', overflowMinutes: 20 })

    await resolveGrowStomach('c1', 70)

    expect(useCircleStore.getState().circles[0].stomachMinutes).toBe(70)
    expect(useTaskStore.getState().tasks[0].remainingMinutes).toBe(70) // untouched
    expect(useUIStore.getState().triage).toBeNull()
  })
})

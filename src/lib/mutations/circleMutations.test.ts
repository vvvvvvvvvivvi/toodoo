import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'
import { attemptCapacityMutation, createCircle, feedTheGoose } from '@/lib/mutations/circleMutations'
import type { Circle, Task } from '@/types/models'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 30,
    state: 'backlog',
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
  await db.settings.clear()
  await db.settings.put(DEFAULT_SETTINGS)
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useUIStore.setState({ triage: null })
})

describe('attemptCapacityMutation (Invariant 1)', () => {
  it('commits addTaskToCircle when it fits, writing through to Dexie and the stores', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'planning' }
    const t = task({ id: 't1', remainingMinutes: 30 })
    await seed([t], [circle])

    const outcome = await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: 'c1', taskId: 't1' })

    expect(outcome).toEqual({ status: 'committed' })
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
    expect(useTaskStore.getState().tasks[0].circleId).toBe('c1')
    const persisted = await db.tasks.get('t1')
    expect(persisted?.state).toBe('planned')
  })

  it('blocks addTaskToCircle that would overflow, opening triage without committing', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 20, state: 'planning' }
    const t = task({ id: 't1', remainingMinutes: 30 })
    await seed([t], [circle])

    const outcome = await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: 'c1', taskId: 't1' })

    expect(outcome).toEqual({ status: 'blocked', overflowMinutes: 10, circleId: 'c1' })
    expect(useTaskStore.getState().tasks[0].state).toBe('backlog') // untouched
    expect(useUIStore.getState().triage).toEqual({
      circleId: 'c1',
      overflowMinutes: 10,
      pendingRequest: { kind: 'addTaskToCircle', circleId: 'c1', taskId: 't1' },
    })
    const persisted = await db.tasks.get('t1')
    expect(persisted?.state).toBe('backlog') // Dexie never touched either
  })

  it('blocks growEstimate that would push a planned task over capacity', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 40, state: 'active' }
    const t = task({ id: 't1', state: 'planned', circleId: 'c1', estimateMinutes: 30, remainingMinutes: 30 })
    await seed([t], [circle])

    const outcome = await attemptCapacityMutation({
      kind: 'growEstimate',
      circleId: 'c1',
      taskId: 't1',
      deltaMinutes: 20,
    })

    expect(outcome.status).toBe('blocked')
    expect(useTaskStore.getState().tasks[0].remainingMinutes).toBe(30) // unchanged
  })

  it('blocks shrinkStomach that would drop below already-planned minutes', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'active' }
    const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 50 })
    await seed([t], [circle])

    const outcome = await attemptCapacityMutation({ kind: 'shrinkStomach', circleId: 'c1', newStomachMinutes: 30 })

    expect(outcome.status).toBe('blocked')
    expect(useCircleStore.getState().circles[0].stomachMinutes).toBe(60) // unchanged
  })
})

describe('feedTheGoose', () => {
  it('sets the circle to active with a savedAt timestamp when within capacity', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'planning' }
    const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })
    await seed([t], [circle])

    const outcome = await feedTheGoose('c1', '2026-07-13T09:00:00.000Z')

    expect(outcome).toEqual({ status: 'committed' })
    const saved = useCircleStore.getState().circles[0]
    expect(saved.state).toBe('active')
    expect(saved.savedAt).toBe('2026-07-13T09:00:00.000Z')
  })

  it('blocks feeding an overfilled circle and opens triage', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 10, state: 'planning' }
    const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })
    await seed([t], [circle])

    const outcome = await feedTheGoose('c1')

    expect(outcome.status).toBe('blocked')
    expect(useCircleStore.getState().circles[0].state).toBe('planning') // never activated
  })

  describe('first-run Notification prompt (never on load, only after first successful save)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('requests Notification permission on the very first successful Feed the Goose', async () => {
      const requestPermission = vi.fn().mockResolvedValue('granted')
      vi.stubGlobal('Notification', { permission: 'default', requestPermission })

      const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'planning' }
      const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })
      await seed([t], [circle])

      await feedTheGoose('c1')

      expect(requestPermission).toHaveBeenCalled()
      expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(true)
    })

    it('does not re-prompt on a second circle\'s successful save', async () => {
      const requestPermission = vi.fn().mockResolvedValue('granted')
      vi.stubGlobal('Notification', { permission: 'default', requestPermission })

      const alreadySaved: Circle = {
        id: 'earlier',
        date: '2026-07-12',
        stomachMinutes: 60,
        state: 'closed',
        savedAt: '2026-07-12T09:00:00.000Z',
      }
      const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'planning' }
      const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })
      await seed([t], [alreadySaved, circle])

      await feedTheGoose('c1')

      expect(requestPermission).not.toHaveBeenCalled()
    })

    it('does not prompt when the save is blocked', async () => {
      const requestPermission = vi.fn()
      vi.stubGlobal('Notification', { permission: 'default', requestPermission })

      const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 10, state: 'planning' }
      const t = task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })
      await seed([t], [circle])

      await feedTheGoose('c1')

      expect(requestPermission).not.toHaveBeenCalled()
    })
  })
})

describe('createCircle (Invariants 2 & 10)', () => {
  it('creates the circle, auto-plants already-due backlog tasks, and immediately activates it (no manual Feed the Goose step)', async () => {
    const due = task({ id: 'due', state: 'backlog', deadline: '2026-07-13' })
    const notYet = task({ id: 'future', state: 'backlog', deadline: '2026-08-01' })
    await seed([due, notYet], [])

    const circle = await createCircle('2026-07-13', 480)

    expect(circle.state).toBe('active')
    expect(circle.savedAt).toBeDefined()
    const tasks = useTaskStore.getState().tasks
    expect(tasks.find((t) => t.id === 'due')?.state).toBe('planned')
    expect(tasks.find((t) => t.id === 'due')?.circleId).toBe(circle.id)
    expect(tasks.find((t) => t.id === 'future')?.state).toBe('backlog')

    const persistedCircle = await db.circles.get(circle.id)
    expect(persistedCircle?.state).toBe('active')
  })

  it('refuses to create a second circle while one is already planning/active', async () => {
    await seed([], [{ id: 'existing', date: '2026-07-13', stomachMinutes: 480, state: 'active' }])
    await expect(createCircle('2026-07-13', 480)).rejects.toThrow()
  })

  it('stays in planning and opens triage when auto-planted overdue tasks alone already overflow the stomach', async () => {
    const overdue = task({ id: 'overdue', state: 'backlog', deadline: '2026-07-01', remainingMinutes: 500 })
    await seed([overdue], [])

    const circle = await createCircle('2026-07-13', 480)

    expect(circle.state).toBe('planning') // never activated
    expect(useUIStore.getState().triage).toEqual({
      circleId: circle.id,
      overflowMinutes: 20,
      pendingRequest: { kind: 'feedTheGoose', circleId: circle.id },
    })
    // The task is still auto-planted (and locked) even though the save itself was blocked.
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
    expect(useTaskStore.getState().tasks[0].circleId).toBe(circle.id)
  })
})

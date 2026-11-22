import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useReflectionStore } from '@/stores/useReflectionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'
import { DEFAULT_SETTINGS } from '@/lib/db/db'
import { closeDueCirclesAndReflect, pinToTomorrow, saveReflectionMood } from '@/lib/mutations/reflectionMutations'
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
  await db.reflections.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useReflectionStore.setState({ reflections: [] })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS }) // dayEndTime 18:00
  useUIStore.setState({ pendingReflection: false, reflectionSummaries: [] })
})

describe('closeDueCirclesAndReflect (Invariants 8 & 11)', () => {
  it('closes a stale circle, releases incomplete tasks to backlog, and records a DayReflection', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-10', stomachMinutes: 480, state: 'active' }
    const incomplete = task({ id: 't1', remainingMinutes: 25 })
    await seed([incomplete], [circle])

    const now = new Date(2026, 6, 13, 10, 0) // three days later, well past any day-end
    await closeDueCirclesAndReflect(now)

    const closedCircle = useCircleStore.getState().circles[0]
    expect(closedCircle.state).toBe('closed')

    const releasedTask = useTaskStore.getState().tasks[0]
    expect(releasedTask.state).toBe('backlog')
    expect(releasedTask.circleId).toBeUndefined()
    expect(releasedTask.remainingMinutes).toBe(25) // intact, not silently deleted

    const reflections = useReflectionStore.getState().reflections
    expect(reflections).toEqual([{ date: '2026-07-10', circleIds: ['c1'] }])

    expect(useUIStore.getState().pendingReflection).toBe(true)
  })

  it("closes today's circle once the clock passes day-end and merges into the same day's reflection", async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([], [circle])
    useReflectionStore.getState().setAll([{ date: '2026-07-13', circleIds: ['earlier-circle'] }])

    const now = new Date(2026, 6, 13, 18, 30)
    await closeDueCirclesAndReflect(now)

    const reflections = useReflectionStore.getState().reflections
    expect(reflections).toEqual([{ date: '2026-07-13', circleIds: ['earlier-circle', 'c1'] }])
  })

  it('is a no-op before day-end with no stale circles', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([], [circle])

    const now = new Date(2026, 6, 13, 12, 0)
    await closeDueCirclesAndReflect(now)

    expect(useCircleStore.getState().circles[0].state).toBe('active')
    expect(useUIStore.getState().pendingReflection).toBe(false)
  })

  it('persists everything to Dexie, not just the in-memory stores', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-10', stomachMinutes: 480, state: 'active' }
    const incomplete = task({ id: 't1' })
    await seed([incomplete], [circle])

    await closeDueCirclesAndReflect(new Date(2026, 6, 13, 10, 0))

    expect((await db.circles.get('c1'))?.state).toBe('closed')
    expect((await db.tasks.get('t1'))?.state).toBe('backlog')
    expect(await db.reflections.get('2026-07-10')).toBeDefined()
  })

  it('returns and stores a fed-vs-digested summary captured before circleId is cleared', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-10', stomachMinutes: 480, state: 'active' }
    const digested = task({ id: 'done', state: 'completed', completedAt: '2026-07-10T10:00:00.000Z' })
    const pantry = task({ id: 'leftover', state: 'planned' })
    await seed([digested, pantry], [circle])

    const summaries = await closeDueCirclesAndReflect(new Date(2026, 6, 13, 10, 0))

    expect(summaries).toEqual([
      { circleId: 'c1', date: '2026-07-10', digestedTaskIds: ['done'], pantryTaskIds: ['leftover'] },
    ])
    expect(useUIStore.getState().reflectionSummaries).toEqual(summaries)
  })

  it('returns an empty summary array with no digested or pantry tasks when nothing needs closing', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([], [circle])

    const summaries = await closeDueCirclesAndReflect(new Date(2026, 6, 13, 12, 0))
    expect(summaries).toEqual([])
  })
})

describe('saveReflectionMood', () => {
  it('creates a reflection record with the mood when none exists yet', async () => {
    await saveReflectionMood('2026-07-13', 'good')
    expect(useReflectionStore.getState().reflections).toEqual([
      { date: '2026-07-13', mood: 'good', circleIds: [] },
    ])
    expect((await db.reflections.get('2026-07-13'))?.mood).toBe('good')
  })

  it('updates the mood on an existing reflection without touching circleIds', async () => {
    useReflectionStore.getState().setAll([{ date: '2026-07-13', circleIds: ['c1'] }])
    await db.reflections.put({ date: '2026-07-13', circleIds: ['c1'] })

    await saveReflectionMood('2026-07-13', 'bad')

    const reflection = useReflectionStore.getState().reflections[0]
    expect(reflection).toEqual({ date: '2026-07-13', mood: 'bad', circleIds: ['c1'] })
  })
})

describe('pinToTomorrow (Invariant 7 one-tap requeue)', () => {
  it("sets the task's deadline to tomorrow's local date", async () => {
    await seed([task({ id: 't1', state: 'backlog', circleId: undefined, deadline: undefined })], [])

    await pinToTomorrow('t1', new Date(2026, 6, 13, 20, 0))

    expect(useTaskStore.getState().tasks[0].deadline).toBe('2026-07-14')
    expect((await db.tasks.get('t1'))?.deadline).toBe('2026-07-14')
  })
})

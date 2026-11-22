import { describe, expect, it } from 'vitest'
import {
  autoPlanDueTasks,
  canCreateNewCircle,
  endCircle,
  isCleanPlate,
} from '@/lib/invariants/circleLifecycle'
import type { Circle, Task } from '@/types/models'

const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }

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

describe('endCircle (Invariant 8)', () => {
  it('releases every incomplete task to backlog with remainingMinutes intact, regardless of lock state', () => {
    const tasks = [
      task({ id: 'unlocked', remainingMinutes: 20 }),
      task({ id: 'locked', remainingMinutes: 15, deadline: '2026-07-13' }),
      task({ id: 'done', state: 'completed', remainingMinutes: 0 }),
    ]
    const { circle: ended, releasedTasks } = endCircle(circle, tasks, 'abandoned', '2026-07-13T18:00:00.000Z')

    expect(ended.state).toBe('abandoned')
    expect(ended.endedAt).toBe('2026-07-13T18:00:00.000Z')
    expect(releasedTasks.map((t) => t.id).sort()).toEqual(['locked', 'unlocked'])
    for (const t of releasedTasks) {
      expect(t.state).toBe('backlog')
      expect(t.circleId).toBeUndefined()
    }
    const unlockedReleased = releasedTasks.find((t) => t.id === 'unlocked')!
    expect(unlockedReleased.remainingMinutes).toBe(20)
  })

  it('never touches completed tasks (poos already earned are preserved untouched)', () => {
    const tasks = [task({ id: 'done', state: 'completed', remainingMinutes: 0, completedAt: 'x' })]
    const { releasedTasks } = endCircle(circle, tasks, 'cleanPlate', '2026-07-13T18:00:00.000Z')
    expect(releasedTasks).toEqual([])
  })
})

describe('isCleanPlate (Invariant 7)', () => {
  it('is true once no planned tasks remain in the circle', () => {
    const tasks = [task({ id: 't1', state: 'completed' })]
    expect(isCleanPlate('c1', tasks)).toBe(true)
  })

  it('is false while any planned task remains', () => {
    const tasks = [task({ id: 't1', state: 'planned' })]
    expect(isCleanPlate('c1', tasks)).toBe(false)
  })
})

describe('autoPlanDueTasks (Invariants 2 & 7)', () => {
  it('plants due backlog tasks into the open circle and marks them planned', () => {
    const tasks = [task({ id: 't1', state: 'backlog', circleId: undefined, deadline: '2026-07-13' })]
    const result = autoPlanDueTasks('2026-07-13', tasks, circle)
    expect(result[0].state).toBe('planned')
    expect(result[0].circleId).toBe('c1')
  })

  it('leaves backlog tasks with a future deadline alone', () => {
    const tasks = [task({ id: 't1', state: 'backlog', circleId: undefined, deadline: '2026-08-01' })]
    const result = autoPlanDueTasks('2026-07-13', tasks, circle)
    expect(result[0].state).toBe('backlog')
  })

  it('is a no-op when no circle is open yet (task stays backlog, rendered as overdue)', () => {
    const tasks = [task({ id: 't1', state: 'backlog', circleId: undefined, deadline: '2026-07-01' })]
    const result = autoPlanDueTasks('2026-07-13', tasks, undefined)
    expect(result).toEqual(tasks)
  })

  it('re-captures a just-released locked task into the next circle opened the same day (Invariant 7 requeue)', () => {
    // Simulates the atomic endCircle -> autoPlanDueTasks sequence for a locked task.
    const locked = task({ id: 'locked', state: 'planned', deadline: '2026-07-13', circleId: 'old-circle' })
    const { releasedTasks } = endCircle({ ...circle, id: 'old-circle' }, [locked], 'abandoned', '2026-07-13T12:00:00.000Z')
    const nextCircle: Circle = { id: 'c2', date: '2026-07-13', stomachMinutes: 480, state: 'planning' }
    const replanted = autoPlanDueTasks('2026-07-13', releasedTasks, nextCircle)
    expect(replanted[0].state).toBe('planned')
    expect(replanted[0].circleId).toBe('c2')
  })

  it('carries a released locked task to tomorrow as overdue backlog when no circle opens the same day', () => {
    const locked = task({ id: 'locked', state: 'planned', deadline: '2026-07-13', circleId: 'old-circle' })
    const { releasedTasks } = endCircle({ ...circle, id: 'old-circle' }, [locked], 'closed', '2026-07-13T23:59:00.000Z')
    const stillBacklog = autoPlanDueTasks('2026-07-13', releasedTasks, undefined)
    expect(stillBacklog[0].state).toBe('backlog')
  })
})

describe('canCreateNewCircle (Invariant 10)', () => {
  it('allows creating a circle when none is planning/active', () => {
    expect(canCreateNewCircle([{ ...circle, state: 'cleanPlate' }])).toBe(true)
    expect(canCreateNewCircle([])).toBe(true)
  })

  it('blocks creating a circle while one is already planning or active', () => {
    expect(canCreateNewCircle([{ ...circle, state: 'planning' }])).toBe(false)
    expect(canCreateNewCircle([{ ...circle, state: 'active' }])).toBe(false)
  })
})

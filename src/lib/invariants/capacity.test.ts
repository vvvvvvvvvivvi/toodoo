import { describe, expect, it } from 'vitest'
import { computePlannedMinutes, validateCircleCapacity } from '@/lib/invariants/capacity'
import type { Circle, Task } from '@/types/models'

const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'planning' }

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

describe('computePlannedMinutes', () => {
  it('sums only planned tasks in the given circle', () => {
    const tasks = [
      task({ id: 't1', remainingMinutes: 30 }),
      task({ id: 't2', remainingMinutes: 20 }),
      task({ id: 't3', remainingMinutes: 100, circleId: 'other-circle' }),
      task({ id: 't4', remainingMinutes: 100, state: 'backlog', circleId: undefined }),
      task({ id: 't5', remainingMinutes: 100, state: 'completed' }),
    ]
    expect(computePlannedMinutes('c1', tasks)).toBe(50)
  })
})

describe('validateCircleCapacity (Invariant 1)', () => {
  it('is ok when planned minutes are within the stomach', () => {
    const tasks = [task({ remainingMinutes: 60 })]
    expect(validateCircleCapacity(circle, tasks)).toEqual({ ok: true })
  })

  it('is ok exactly at capacity', () => {
    const tasks = [task({ remainingMinutes: 60 })]
    expect(validateCircleCapacity({ ...circle, stomachMinutes: 60 }, tasks)).toEqual({ ok: true })
  })

  it('reports the exact overflow when over capacity', () => {
    const tasks = [task({ id: 't1', remainingMinutes: 40 }), task({ id: 't2', remainingMinutes: 30 })]
    expect(validateCircleCapacity(circle, tasks)).toEqual({ ok: false, overflowMinutes: 10 })
  })
})

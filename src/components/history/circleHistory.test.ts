import { describe, expect, it } from 'vitest'
import { getDigestedTasksFor, getPastCircles } from '@/components/history/circleHistory'
import type { Circle, Task } from '@/types/models'

function circle(overrides: Partial<Circle>): Circle {
  return { id: overrides.id ?? 'c1', date: '2026-07-10', stomachMinutes: 480, state: 'cleanPlate', ...overrides }
}

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 0,
    state: 'completed',
    sortIndex: 0,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

describe('getPastCircles', () => {
  it('excludes planning/active circles', () => {
    const circles = [
      circle({ id: 'done', state: 'cleanPlate' }),
      circle({ id: 'open', state: 'active' }),
      circle({ id: 'planning', state: 'planning' }),
    ]
    expect(getPastCircles(circles).map((c) => c.id)).toEqual(['done'])
  })

  it('orders newest date first', () => {
    const circles = [
      circle({ id: 'older', date: '2026-07-01' }),
      circle({ id: 'newer', date: '2026-07-10' }),
    ]
    expect(getPastCircles(circles).map((c) => c.id)).toEqual(['newer', 'older'])
  })

  it('breaks same-day ties by endedAt, latest first', () => {
    const circles = [
      circle({ id: 'first', date: '2026-07-10', endedAt: '2026-07-10T09:00:00.000Z' }),
      circle({ id: 'second', date: '2026-07-10', endedAt: '2026-07-10T15:00:00.000Z' }),
    ]
    expect(getPastCircles(circles).map((c) => c.id)).toEqual(['second', 'first'])
  })
})

describe('getDigestedTasksFor', () => {
  it('returns only completed tasks still linked to the circle, oldest first', () => {
    const tasks = [
      task({ id: 'a', completedAt: '2026-07-10T10:00:00.000Z', circleId: 'c1' }),
      task({ id: 'b', completedAt: '2026-07-10T09:00:00.000Z', circleId: 'c1' }),
      task({ id: 'planned', state: 'planned', circleId: 'c1' }),
      task({ id: 'other-circle', circleId: 'c2' }),
      task({ id: 'released', state: 'backlog', circleId: undefined }),
    ]
    expect(getDigestedTasksFor('c1', tasks).map((t) => t.id)).toEqual(['b', 'a'])
  })
})

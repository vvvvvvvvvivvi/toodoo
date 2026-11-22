import { describe, expect, it } from 'vitest'
import { getFillMyDaySuggestions } from '@/lib/invariants/fillMyDay'
import type { Task } from '@/types/models'

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

describe('getFillMyDaySuggestions (Invariant 9)', () => {
  it('orders by nearest deadline first', () => {
    const tasks = [
      task({ id: 'far', deadline: '2026-08-01', remainingMinutes: 20 }),
      task({ id: 'near', deadline: '2026-07-14', remainingMinutes: 20 }),
    ]
    const result = getFillMyDaySuggestions(tasks, 60)
    expect(result.map((t) => t.id)).toEqual(['near', 'far'])
  })

  it('sorts undeadlined tasks after deadlined ones', () => {
    const tasks = [
      task({ id: 'no-deadline', remainingMinutes: 20 }),
      task({ id: 'has-deadline', deadline: '2026-08-01', remainingMinutes: 20 }),
    ]
    const result = getFillMyDaySuggestions(tasks, 60)
    expect(result.map((t) => t.id)).toEqual(['has-deadline', 'no-deadline'])
  })

  it('tie-breaks by oldest createdAt when deadlines match (or both are absent)', () => {
    const tasks = [
      task({ id: 'newer', createdAt: '2026-07-12T00:00:00.000Z', remainingMinutes: 20 }),
      task({ id: 'older', createdAt: '2026-07-01T00:00:00.000Z', remainingMinutes: 20 }),
    ]
    const result = getFillMyDaySuggestions(tasks, 60)
    expect(result.map((t) => t.id)).toEqual(['older', 'newer'])
  })

  it('filters to tasks that fit the gap when at least one fits', () => {
    const tasks = [task({ id: 'fits', remainingMinutes: 20 }), task({ id: 'too-big', remainingMinutes: 200 })]
    const result = getFillMyDaySuggestions(tasks, 30)
    expect(result.map((t) => t.id)).toEqual(['fits'])
  })

  it('falls back to the full sorted list when nothing fits the gap', () => {
    const tasks = [task({ id: 'a', remainingMinutes: 200 }), task({ id: 'b', remainingMinutes: 300 })]
    const result = getFillMyDaySuggestions(tasks, 30)
    expect(result.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('returns nothing when there is no gap to fill', () => {
    const tasks = [task({ id: 'a', remainingMinutes: 10 })]
    expect(getFillMyDaySuggestions(tasks, 0)).toEqual([])
    expect(getFillMyDaySuggestions(tasks, -10)).toEqual([])
  })
})

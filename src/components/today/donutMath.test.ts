import { describe, expect, it } from 'vitest'
import { buildDonutSegments } from '@/components/today/donutMath'
import type { Circle, Task } from '@/types/models'

const today = '2026-07-13'
const circle: Circle = { id: 'c1', date: today, stomachMinutes: 100, state: 'active' }

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

describe('buildDonutSegments', () => {
  it('sizes a digested segment by the ORIGINAL estimate, not remaining', () => {
    const t = task({ id: 't1', state: 'completed', estimateMinutes: 40, remainingMinutes: 0 })
    const segments = buildDonutSegments(circle, [t], today)
    const digested = segments.find((s) => s.kind === 'digested')!
    expect(digested.minutes).toBe(40)
  })

  it('sizes planned/locked segments by remainingMinutes', () => {
    const unlocked = task({ id: 'unlocked', remainingMinutes: 25 })
    const locked = task({ id: 'locked', remainingMinutes: 15, deadline: today })
    const segments = buildDonutSegments(circle, [unlocked, locked], today)
    expect(segments.find((s) => s.key === 'unlocked')).toMatchObject({ kind: 'planned', minutes: 25 })
    expect(segments.find((s) => s.key === 'locked')).toMatchObject({ kind: 'locked', minutes: 15 })
  })

  it('fills the remainder with an empty segment', () => {
    const t = task({ id: 't1', remainingMinutes: 60 })
    const segments = buildDonutSegments(circle, [t], today)
    const empty = segments.find((s) => s.kind === 'empty')!
    expect(empty.minutes).toBe(40) // stomach 100 - used 60
  })

  it('omits the empty segment when the circle is exactly full', () => {
    const t = task({ id: 't1', remainingMinutes: 100 })
    const segments = buildDonutSegments(circle, [t], today)
    expect(segments.some((s) => s.kind === 'empty')).toBe(false)
  })

  it('produces cumulative fractions that sweep from 0 to 1 across all segments', () => {
    const a = task({ id: 'a', remainingMinutes: 30, sortIndex: 0 })
    const b = task({ id: 'b', remainingMinutes: 20, sortIndex: 1 })
    const segments = buildDonutSegments(circle, [a, b], today)

    expect(segments[0].start).toBe(0)
    expect(segments[0].end).toBeCloseTo(0.3)
    expect(segments[1].start).toBeCloseTo(0.3)
    expect(segments[1].end).toBeCloseTo(0.5)
    expect(segments[segments.length - 1].end).toBeCloseTo(1)
  })

  it('orders completed tasks before planned tasks, planned tasks by sortIndex', () => {
    const planned = task({ id: 'planned', sortIndex: 0 })
    const completed = task({ id: 'completed', state: 'completed', completedAt: '2026-07-13T09:00:00.000Z' })
    const segments = buildDonutSegments(circle, [planned, completed], today)
    expect(segments.map((s) => s.key)).toEqual(['completed', 'planned', 'empty'])
  })

  it('clamps the scale so a transient overflow never sweeps past a full semicircle', () => {
    const overflowing = task({ id: 't1', remainingMinutes: 150 }) // exceeds stomachMinutes=100
    const segments = buildDonutSegments(circle, [overflowing], today)
    expect(segments).toHaveLength(1) // no empty segment, nothing left over
    expect(segments[0].start).toBe(0)
    expect(segments[0].end).toBeCloseTo(1) // scaled to fill exactly the full sweep, not overflow it
  })

  it('ignores tasks belonging to other circles', () => {
    const other = task({ id: 'other', circleId: 'c2', remainingMinutes: 999 })
    const segments = buildDonutSegments(circle, [other], today)
    expect(segments.find((s) => s.key === 'other')).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { isLocked } from '@/lib/invariants/lock'
import type { Task } from '@/types/models'

const base: Task = {
  id: 't1',
  title: 'Due task',
  estimateMinutes: 30,
  remainingMinutes: 30,
  state: 'planned',
  circleId: 'c1',
  sortIndex: 0,
  createdAt: '2026-07-10T00:00:00.000Z',
}

describe('isLocked (Invariant 2)', () => {
  it('locks a planned task whose deadline is today', () => {
    expect(isLocked({ ...base, deadline: '2026-07-13' }, '2026-07-13')).toBe(true)
  })

  it('locks a planned task whose deadline is in the past', () => {
    expect(isLocked({ ...base, deadline: '2026-07-01' }, '2026-07-13')).toBe(true)
  })

  it('does not lock a planned task with a future deadline', () => {
    expect(isLocked({ ...base, deadline: '2026-07-20' }, '2026-07-13')).toBe(false)
  })

  it('does not lock a task with no deadline', () => {
    expect(isLocked({ ...base, deadline: undefined }, '2026-07-13')).toBe(false)
  })

  it('does not lock a backlog task even if its deadline has passed (unlock via edit only applies to already-locked tasks)', () => {
    expect(isLocked({ ...base, state: 'backlog', circleId: undefined, deadline: '2026-07-01' }, '2026-07-13')).toBe(false)
  })

  it('does not lock a completed task', () => {
    expect(isLocked({ ...base, state: 'completed', deadline: '2026-07-01' }, '2026-07-13')).toBe(false)
  })

  it('unlocks the instant the deadline is edited to the future', () => {
    const locked = { ...base, deadline: '2026-07-01' }
    expect(isLocked(locked, '2026-07-13')).toBe(true)
    const edited = { ...locked, deadline: '2026-07-20' }
    expect(isLocked(edited, '2026-07-13')).toBe(false)
  })
})

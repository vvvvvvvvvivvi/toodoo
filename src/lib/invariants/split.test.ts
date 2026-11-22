import { describe, expect, it } from 'vitest'
import { splitTask } from '@/lib/invariants/split'
import type { Task } from '@/types/models'

const original: Task = {
  id: 'orig',
  title: 'Write report',
  estimateMinutes: 100,
  remainingMinutes: 100,
  deadline: '2026-08-01',
  state: 'planned',
  circleId: 'c1',
  sortIndex: 3,
  createdAt: '2026-07-10T00:00:00.000Z',
}

describe('splitTask (Invariant 5)', () => {
  it('produces two siblings sized to keep vs. overflow, both flat-linked via splitFromId', () => {
    const [siblingA, siblingB] = splitTask(original, 40, '2026-07-13T09:00:00.000Z')

    expect(siblingA.id).not.toBe(original.id)
    expect(siblingB.id).not.toBe(original.id)
    expect(siblingA.id).not.toBe(siblingB.id)

    expect(siblingA.splitFromId).toBe('orig')
    expect(siblingB.splitFromId).toBe('orig')

    expect(siblingA.estimateMinutes).toBe(60)
    expect(siblingA.remainingMinutes).toBe(60)
    expect(siblingA.state).toBe('planned')
    expect(siblingA.circleId).toBe('c1')

    expect(siblingB.estimateMinutes).toBe(40)
    expect(siblingB.remainingMinutes).toBe(40)
    expect(siblingB.state).toBe('backlog')
    expect(siblingB.circleId).toBeUndefined()
  })

  it('resets estimateMinutes per sibling rather than inheriting the original estimate', () => {
    const [siblingA, siblingB] = splitTask(original, 25, '2026-07-13T09:00:00.000Z')
    expect(siblingA.estimateMinutes).toBe(75)
    expect(siblingB.estimateMinutes).toBe(25)
    expect(siblingA.estimateMinutes).not.toBe(original.estimateMinutes)
  })

  it('a re-split of a sibling points splitFromId at the sibling, never the grandparent (flat lineage)', () => {
    const [siblingA] = splitTask(original, 40, '2026-07-13T09:00:00.000Z')
    const [grandchildA, grandchildB] = splitTask(siblingA, 10, '2026-07-14T09:00:00.000Z')
    expect(grandchildA.splitFromId).toBe(siblingA.id)
    expect(grandchildB.splitFromId).toBe(siblingA.id)
  })

  it('throws for a non-positive or full-remaining overflow', () => {
    expect(() => splitTask(original, 0, '2026-07-13T09:00:00.000Z')).toThrow()
    expect(() => splitTask(original, 100, '2026-07-13T09:00:00.000Z')).toThrow()
    expect(() => splitTask(original, 150, '2026-07-13T09:00:00.000Z')).toThrow()
  })
})

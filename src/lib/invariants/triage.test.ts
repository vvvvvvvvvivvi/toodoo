import { describe, expect, it } from 'vitest'
import { getTriageOptions } from '@/lib/invariants/triage'
import type { Circle, Task } from '@/types/models'

const today = '2026-07-13'
const circle: Circle = { id: 'c1', date: today, stomachMinutes: 100, state: 'planning' }

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

describe('getTriageOptions (Invariant 4 — normal overflow, unlocked tasks present)', () => {
  it('returns the five groups in the exact required order', () => {
    const tasks = [task({ id: 't1', remainingMinutes: 80 }), task({ id: 't2', remainingMinutes: 40 })]
    const groups = getTriageOptions(circle, tasks, 20, today)
    expect(groups.map((g) => g.kind)).toEqual([
      'split',
      'returnToBacklog',
      'shrinkEstimate',
      'delete',
      'moveDeadline',
    ])
  })

  it('targets the largest splittable unlocked task, sized to the exact overflow', () => {
    const tasks = [task({ id: 'small', remainingMinutes: 25 }), task({ id: 'big', remainingMinutes: 80 })]
    const groups = getTriageOptions(circle, tasks, 20, today)
    const split = groups.find((g) => g.kind === 'split')!
    expect(split.targets).toEqual([{ taskId: 'big', suggestedSplitMinutes: 20 }])
  })

  it('excludes candidates whose remainingMinutes does not exceed the overflow', () => {
    const tasks = [task({ id: 't1', remainingMinutes: 15 })]
    const groups = getTriageOptions(circle, tasks, 20, today)
    const split = groups.find((g) => g.kind === 'split')!
    expect(split.targets).toEqual([])
  })

  it('tie-breaks split candidates by oldest createdAt when remainingMinutes match', () => {
    const tasks = [
      task({ id: 'newer', remainingMinutes: 80, createdAt: '2026-07-12T00:00:00.000Z' }),
      task({ id: 'older', remainingMinutes: 80, createdAt: '2026-07-01T00:00:00.000Z' }),
    ]
    const groups = getTriageOptions(circle, tasks, 20, today)
    const split = groups.find((g) => g.kind === 'split')!
    expect(split.targets[0].taskId).toBe('older')
  })

  it('excludes locked tasks from split/returnToBacklog/shrink/delete, and moveDeadline only lists locked tasks', () => {
    const tasks = [
      task({ id: 'unlocked', remainingMinutes: 80 }),
      task({ id: 'locked', remainingMinutes: 10, deadline: today }),
    ]
    const groups = getTriageOptions(circle, tasks, 5, today)
    const returnToBacklog = groups.find((g) => g.kind === 'returnToBacklog')!
    const shrink = groups.find((g) => g.kind === 'shrinkEstimate')!
    const del = groups.find((g) => g.kind === 'delete')!
    const moveDeadline = groups.find((g) => g.kind === 'moveDeadline')!

    expect(returnToBacklog.targets.map((t) => t.taskId)).toEqual(['unlocked'])
    expect(shrink.targets.map((t) => t.taskId)).toEqual(['unlocked'])
    expect(del.targets.map((t) => t.taskId)).toEqual(['unlocked'])
    expect(moveDeadline.targets.map((t) => t.taskId)).toEqual(['locked'])
  })

  it('computes maxShrinkMinutes as remainingMinutes minus the shrink floor', () => {
    const tasks = [task({ id: 't1', remainingMinutes: 80 })]
    const groups = getTriageOptions(circle, tasks, 20, today)
    const shrink = groups.find((g) => g.kind === 'shrinkEstimate')!
    expect(shrink.targets[0].maxShrinkMinutes).toBe(75) // 80 - MIN_ESTIMATE_MINUTES(5)
  })
})

describe('getTriageOptions (Invariant 3 — locked-only overflow)', () => {
  it('returns only moveDeadline, shrinkEstimate, and growStomach when locked tasks alone exceed the stomach', () => {
    const tasks = [
      task({ id: 'locked1', remainingMinutes: 70, deadline: today }),
      task({ id: 'locked2', remainingMinutes: 60, deadline: today }),
      task({ id: 'unlocked', remainingMinutes: 10 }),
    ]
    const groups = getTriageOptions(circle, tasks, 30, today) // lockedMinutes=130 > stomach=100
    expect(groups.map((g) => g.kind)).toEqual(['moveDeadline', 'shrinkEstimate', 'growStomach'])
    expect(groups[0].targets.map((t) => t.taskId).sort()).toEqual(['locked1', 'locked2'])
    expect(groups[2].suggestedStomachMinutes).toBe(130)
  })
})

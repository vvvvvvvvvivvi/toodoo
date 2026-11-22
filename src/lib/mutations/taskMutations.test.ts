import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { usePooStore } from '@/stores/usePooStore'
import {
  addTask,
  completeTask,
  deleteTask,
  editBacklogTask,
  editPlannedTask,
  nibbleTask,
  reorderPlannedTasks,
  returnToBacklog,
  shrinkEstimateDirect,
  updateTaskDeadline,
} from '@/lib/mutations/taskMutations'
import { useUIStore } from '@/stores/useUIStore'
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

async function seed(tasks: Task[], circles: Circle[] = []) {
  await db.tasks.bulkPut(tasks)
  await db.circles.bulkPut(circles)
  useTaskStore.getState().setAll(tasks)
  useCircleStore.getState().setAll(circles)
}

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  await db.poos.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  usePooStore.setState({ poos: [] })
})

describe('nibbleTask', () => {
  it('reduces remainingMinutes and creates no poo', async () => {
    await seed([task({ id: 't1', remainingMinutes: 30 })])
    await nibbleTask('t1', 10)

    expect(useTaskStore.getState().tasks[0].remainingMinutes).toBe(20)
    expect(usePooStore.getState().poos).toEqual([])
    expect((await db.tasks.get('t1'))?.remainingMinutes).toBe(20)
  })

  it('floors remainingMinutes at 0 and still requires an explicit complete action', async () => {
    await seed([task({ id: 't1', remainingMinutes: 10 })])
    await nibbleTask('t1', 999)

    const t = useTaskStore.getState().tasks[0]
    expect(t.remainingMinutes).toBe(0)
    expect(t.state).toBe('backlog') // not auto-completed
    expect(usePooStore.getState().poos).toEqual([])
  })
})

describe('completeTask (Invariant 6)', () => {
  it('creates exactly one poo sized by the ORIGINAL estimateMinutes, not remaining', async () => {
    await seed([task({ id: 't1', estimateMinutes: 120, remainingMinutes: 5 })]) // nibbled down to 5
    const { poo, cleanPlate } = await completeTask('t1', '2026-07-13T10:00:00.000Z')

    expect(poo.size).toBe('large') // from the 120-minute original estimate
    expect(poo.taskId).toBe('t1')
    expect(usePooStore.getState().poos).toEqual([poo])
    expect(useTaskStore.getState().tasks[0].state).toBe('completed')
    expect(cleanPlate).toBe(false) // task wasn't in a circle
  })

  it('sets the circle to cleanPlate when the completed task was the last planned one (Invariant 7)', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'active' }
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 })], [circle])

    const { cleanPlate } = await completeTask('t1', '2026-07-13T10:00:00.000Z')

    expect(cleanPlate).toBe(true)
    const updated = useCircleStore.getState().circles[0]
    expect(updated.state).toBe('cleanPlate')
    expect(updated.endedAt).toBe('2026-07-13T10:00:00.000Z')
  })

  it('does not close the circle while other planned tasks remain', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 60, state: 'active' }
    await seed(
      [
        task({ id: 't1', state: 'planned', circleId: 'c1', remainingMinutes: 30 }),
        task({ id: 't2', state: 'planned', circleId: 'c1', remainingMinutes: 20 }),
      ],
      [circle],
    )

    const { cleanPlate } = await completeTask('t1')
    expect(cleanPlate).toBe(false)
    expect(useCircleStore.getState().circles[0].state).toBe('active')
  })
})

describe('returnToBacklog (Invariant 2)', () => {
  it('returns an unlocked planned task to backlog', async () => {
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1' })])
    await returnToBacklog('t1', '2026-07-13')

    const t = useTaskStore.getState().tasks[0]
    expect(t.state).toBe('backlog')
    expect(t.circleId).toBeUndefined()
  })

  it('refuses to return a locked task to backlog', async () => {
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', deadline: '2026-07-13' })])
    await expect(returnToBacklog('t1', '2026-07-13')).rejects.toThrow()
    expect(useTaskStore.getState().tasks[0].state).toBe('planned') // untouched
  })
})

describe('deleteTask (Invariant 2)', () => {
  it('deletes an unlocked task', async () => {
    await seed([task({ id: 't1' })])
    await deleteTask('t1', '2026-07-13')
    expect(useTaskStore.getState().tasks).toEqual([])
    expect(await db.tasks.get('t1')).toBeUndefined()
  })

  it('refuses to delete a locked task', async () => {
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', deadline: '2026-07-01' })])
    await expect(deleteTask('t1', '2026-07-13')).rejects.toThrow()
    expect(useTaskStore.getState().tasks).toHaveLength(1)
  })
})

describe('shrinkEstimateDirect', () => {
  it('shrinks both estimate and remaining minutes by the same delta', async () => {
    await seed([task({ id: 't1', estimateMinutes: 60, remainingMinutes: 60 })])
    await shrinkEstimateDirect('t1', 40)

    const t = useTaskStore.getState().tasks[0]
    expect(t.estimateMinutes).toBe(40)
    expect(t.remainingMinutes).toBe(40)
  })

  it('never drops remainingMinutes below 0 when it was already less than the delta', async () => {
    await seed([task({ id: 't1', estimateMinutes: 60, remainingMinutes: 10 })])
    await shrinkEstimateDirect('t1', 20)

    expect(useTaskStore.getState().tasks[0].remainingMinutes).toBe(0)
  })

  it('refuses to grow the estimate through this path', async () => {
    await seed([task({ id: 't1', estimateMinutes: 60, remainingMinutes: 60 })])
    await expect(shrinkEstimateDirect('t1', 90)).rejects.toThrow()
  })
})

describe('updateTaskDeadline (Invariant 2 unlock mechanism)', () => {
  it('moving the deadline out unlocks a previously-locked task', async () => {
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', deadline: '2026-07-01' })])
    await updateTaskDeadline('t1', '2026-08-01')
    expect(useTaskStore.getState().tasks[0].deadline).toBe('2026-08-01')
  })

  it('auto-plants a backlog task whose deadline is moved straight to today, while a circle is open', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([task({ id: 't1', state: 'backlog', circleId: undefined })], [circle])

    await updateTaskDeadline('t1', '2026-07-13', '2026-07-13')

    const t = useTaskStore.getState().tasks[0]
    expect(t.state).toBe('planned')
    expect(t.circleId).toBe('c1')
  })

  it('does not auto-plant when pinning to a future date (tomorrow is not due yet)', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([task({ id: 't1', state: 'backlog', circleId: undefined })], [circle])

    await updateTaskDeadline('t1', '2026-07-14', '2026-07-13')

    expect(useTaskStore.getState().tasks[0].state).toBe('backlog')
  })
})

describe('addTask (Backlog capture)', () => {
  it('creates a backlog task with remainingMinutes === estimateMinutes', async () => {
    await seed([])
    const created = await addTask(
      { title: '  Write report  ', estimateMinutes: 45, deadline: '2026-08-01' },
      '2026-07-13T09:00:00.000Z',
    )

    expect(created.title).toBe('Write report') // trimmed
    expect(created.state).toBe('backlog')
    expect(created.estimateMinutes).toBe(45)
    expect(created.remainingMinutes).toBe(45)
    expect(created.deadline).toBe('2026-08-01')
    expect(created.createdAt).toBe('2026-07-13T09:00:00.000Z')

    expect(useTaskStore.getState().tasks).toEqual([created])
    expect(await db.tasks.get(created.id)).toEqual(created)
  })

  it('assigns an increasing sortIndex after existing tasks', async () => {
    await seed([task({ id: 'existing', sortIndex: 3 })])
    const created = await addTask({ title: 'New', estimateMinutes: 15 })
    expect(created.sortIndex).toBe(4)
  })

  it('rejects an empty title or non-positive estimate', async () => {
    await seed([])
    await expect(addTask({ title: '   ', estimateMinutes: 15 })).rejects.toThrow()
    await expect(addTask({ title: 'Task', estimateMinutes: 0 })).rejects.toThrow()
  })

  it('auto-plants and locks a task captured with a due-today deadline while a circle is open (Invariant 2)', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([], [circle])

    const created = await addTask(
      { title: 'Urgent', estimateMinutes: 30, deadline: '2026-07-13' },
      '2026-07-13T09:00:00.000Z',
      '2026-07-13',
    )

    expect(created.state).toBe('planned')
    expect(created.circleId).toBe('c1')
  })

  it('leaves a not-yet-due task in the backlog even with a circle open', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([], [circle])

    const created = await addTask(
      { title: 'Later', estimateMinutes: 30, deadline: '2026-08-01' },
      '2026-07-13T09:00:00.000Z',
      '2026-07-13',
    )

    expect(created.state).toBe('backlog')
  })

  it('leaves a due-today task in the backlog when no circle is open yet', async () => {
    await seed([], [])
    const created = await addTask(
      { title: 'Urgent', estimateMinutes: 30, deadline: '2026-07-13' },
      '2026-07-13T09:00:00.000Z',
      '2026-07-13',
    )
    expect(created.state).toBe('backlog')
  })

  it('persists tags', async () => {
    await seed([])
    const created = await addTask({ title: 'Tagged', estimateMinutes: 15, tags: ['work', 'urgent'] })
    expect(created.tags).toEqual(['work', 'urgent'])
    expect((await db.tasks.get(created.id))?.tags).toEqual(['work', 'urgent'])
  })
})

describe('editBacklogTask', () => {
  it('updates title, estimate, and deadline, keeping remaining in sync with estimate', async () => {
    await seed([task({ id: 't1', title: 'Old', estimateMinutes: 30, remainingMinutes: 30 })])
    await editBacklogTask('t1', { title: 'New title', estimateMinutes: 60, deadline: '2026-09-01' })

    const t = useTaskStore.getState().tasks[0]
    expect(t.title).toBe('New title')
    expect(t.estimateMinutes).toBe(60)
    expect(t.remainingMinutes).toBe(60)
    expect(t.deadline).toBe('2026-09-01')
  })

  it('clears the deadline when omitted from the input', async () => {
    await seed([task({ id: 't1', deadline: '2026-08-01' })])
    await editBacklogTask('t1', { title: 'Task', estimateMinutes: 30 })
    expect(useTaskStore.getState().tasks[0].deadline).toBeUndefined()
  })

  it('refuses to edit a task that is no longer in backlog', async () => {
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1' })])
    await expect(editBacklogTask('t1', { title: 'Task', estimateMinutes: 30 })).rejects.toThrow()
  })

  it('auto-plants a backlog task edited to a due-today deadline while a circle is open', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active' }
    await seed([task({ id: 't1' })], [circle])

    await editBacklogTask('t1', { title: 'Task', estimateMinutes: 30, deadline: '2026-07-13' }, '2026-07-13')

    const t = useTaskStore.getState().tasks[0]
    expect(t.state).toBe('planned')
    expect(t.circleId).toBe('c1')
  })

  it('persists tags', async () => {
    await seed([task({ id: 't1' })])
    await editBacklogTask('t1', { title: 'Task', estimateMinutes: 30, tags: ['home'] })
    expect(useTaskStore.getState().tasks[0].tags).toEqual(['home'])
  })
})

describe('editPlannedTask (Today edit flow)', () => {
  it('updates title, tags, and deadline directly with no capacity impact', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 100, state: 'active' }
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', title: 'Old' })], [circle])

    await editPlannedTask('c1', 't1', { title: 'New', estimateMinutes: 30, deadline: '2026-08-01', tags: ['x'] })

    const t = useTaskStore.getState().tasks[0]
    expect(t.title).toBe('New')
    expect(t.deadline).toBe('2026-08-01')
    expect(t.tags).toEqual(['x'])
  })

  it('shrinks the estimate directly (monotonic, always safe) when decreased', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 100, state: 'active' }
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', estimateMinutes: 60, remainingMinutes: 60 })], [circle])

    await editPlannedTask('c1', 't1', { title: 'Task', estimateMinutes: 40 })

    const t = useTaskStore.getState().tasks[0]
    expect(t.estimateMinutes).toBe(40)
    expect(t.remainingMinutes).toBe(40)
  })

  it('grows the estimate through the capacity-checked path, opening triage if it overflows', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 50, state: 'active' }
    await seed([task({ id: 't1', state: 'planned', circleId: 'c1', estimateMinutes: 30, remainingMinutes: 30 })], [circle])
    useUIStore.setState({ triage: null })

    await editPlannedTask('c1', 't1', { title: 'Task', estimateMinutes: 60 }) // +30 -> 60 total, over the 50m stomach

    expect(useTaskStore.getState().tasks[0].remainingMinutes).toBe(30) // unchanged, blocked
    expect(useUIStore.getState().triage).not.toBeNull()
  })

  it('allows editing a locked task (Invariant 2 only restricts delete/return-to-backlog)', async () => {
    const circle: Circle = { id: 'c1', date: '2026-07-13', stomachMinutes: 100, state: 'active' }
    await seed(
      [task({ id: 't1', state: 'planned', circleId: 'c1', deadline: '2026-07-13', title: 'Locked' })],
      [circle],
    )

    await editPlannedTask('c1', 't1', { title: 'Still locked', estimateMinutes: 30 })
    expect(useTaskStore.getState().tasks[0].title).toBe('Still locked')
  })
})

describe('reorderPlannedTasks (Today drag-reorder)', () => {
  it('applies the new sortIndex ordering to planned tasks in the given circle', async () => {
    await seed([
      task({ id: 'a', state: 'planned', circleId: 'c1', sortIndex: 0 }),
      task({ id: 'b', state: 'planned', circleId: 'c1', sortIndex: 1 }),
      task({ id: 'c', state: 'planned', circleId: 'c1', sortIndex: 2 }),
    ])

    await reorderPlannedTasks('c1', ['c', 'a', 'b'])

    const byId = Object.fromEntries(useTaskStore.getState().tasks.map((t) => [t.id, t.sortIndex]))
    expect(byId).toEqual({ c: 0, a: 1, b: 2 })

    const persisted = Object.fromEntries((await db.tasks.toArray()).map((t) => [t.id, t.sortIndex]))
    expect(persisted).toEqual({ c: 0, a: 1, b: 2 })
  })

  it('leaves tasks from other circles or non-planned tasks untouched', async () => {
    await seed([
      task({ id: 'here', state: 'planned', circleId: 'c1', sortIndex: 0 }),
      task({ id: 'elsewhere', state: 'planned', circleId: 'c2', sortIndex: 0 }),
      task({ id: 'backlogged', state: 'backlog', circleId: undefined, sortIndex: 5 }),
    ])

    await reorderPlannedTasks('c1', ['here'])

    const tasks = useTaskStore.getState().tasks
    expect(tasks.find((t) => t.id === 'elsewhere')?.sortIndex).toBe(0)
    expect(tasks.find((t) => t.id === 'backlogged')?.sortIndex).toBe(5)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/db'
import { hydrateAll } from '@/lib/db/hydrate'
import type { Task } from '@/types/models'

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  await db.poos.clear()
  await db.reflections.clear()
  await db.settings.clear()
})

describe('ToodooDB (fake-indexeddb)', () => {
  it('writes and reads a task through the real Dexie tables', async () => {
    const task: Task = {
      id: 't1',
      title: 'Eat a snack',
      estimateMinutes: 15,
      remainingMinutes: 15,
      state: 'backlog',
      sortIndex: 0,
      createdAt: new Date().toISOString(),
    }

    await db.tasks.put(task)
    const stored = await db.tasks.get('t1')
    expect(stored).toEqual(task)
  })

  it('hydrateAll seeds default settings when none exist', async () => {
    const state = await hydrateAll()
    expect(state.tasks).toEqual([])
    expect(state.settings.dayEndTime).toBe('18:00')

    const persisted = await db.settings.get('singleton')
    expect(persisted?.dayEndTime).toBe('18:00')
  })
})

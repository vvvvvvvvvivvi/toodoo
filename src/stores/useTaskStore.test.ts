import { describe, expect, it } from 'vitest'
import { useTaskStore } from '@/stores/useTaskStore'
import type { Task } from '@/types/models'

const task: Task = {
  id: 't1',
  title: 'Test task',
  estimateMinutes: 30,
  remainingMinutes: 30,
  state: 'backlog',
  sortIndex: 0,
  createdAt: new Date().toISOString(),
}

describe('useTaskStore', () => {
  it('hydrates and replaces tasks', () => {
    useTaskStore.getState().hydrate([task])
    expect(useTaskStore.getState().tasks).toEqual([task])

    useTaskStore.getState().setAll([])
    expect(useTaskStore.getState().tasks).toEqual([])
  })
})

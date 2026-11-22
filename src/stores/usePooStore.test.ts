import { describe, expect, it } from 'vitest'
import { usePooStore } from '@/stores/usePooStore'
import type { Poo } from '@/types/models'

const poo: Poo = {
  id: 'p1',
  size: 'small',
  earnedAt: new Date().toISOString(),
  taskId: 't1',
}

describe('usePooStore', () => {
  it('hydrates and replaces poos', () => {
    usePooStore.getState().hydrate([poo])
    expect(usePooStore.getState().poos).toEqual([poo])

    usePooStore.getState().setAll([])
    expect(usePooStore.getState().poos).toEqual([])
  })
})

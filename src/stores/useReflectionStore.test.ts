import { describe, expect, it } from 'vitest'
import { useReflectionStore } from '@/stores/useReflectionStore'
import type { DayReflection } from '@/types/models'

const reflection: DayReflection = {
  date: '2026-07-13',
  mood: 'good',
  circleIds: ['c1'],
}

describe('useReflectionStore', () => {
  it('hydrates and replaces reflections', () => {
    useReflectionStore.getState().hydrate([reflection])
    expect(useReflectionStore.getState().reflections).toEqual([reflection])

    useReflectionStore.getState().setAll([])
    expect(useReflectionStore.getState().reflections).toEqual([])
  })
})

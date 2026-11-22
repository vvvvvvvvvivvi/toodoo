import { describe, expect, it } from 'vitest'
import { useCircleStore } from '@/stores/useCircleStore'
import type { Circle } from '@/types/models'

const circle: Circle = {
  id: 'c1',
  date: '2026-07-13',
  stomachMinutes: 480,
  state: 'planning',
}

describe('useCircleStore', () => {
  it('hydrates and replaces circles', () => {
    useCircleStore.getState().hydrate([circle])
    expect(useCircleStore.getState().circles).toEqual([circle])

    useCircleStore.getState().setAll([])
    expect(useCircleStore.getState().circles).toEqual([])
  })
})

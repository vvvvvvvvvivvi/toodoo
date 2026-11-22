import { describe, expect, it } from 'vitest'
import { poosEarnedOn, summarizePoos } from '@/components/poopile/pooStats'
import type { Poo } from '@/types/models'

function poo(overrides: Partial<Poo>): Poo {
  return {
    id: overrides.id ?? 'p1',
    size: 'small',
    earnedAt: '2026-07-13T12:00:00.000Z',
    taskId: 't1',
    ...overrides,
  }
}

describe('summarizePoos', () => {
  it('counts totals per size', () => {
    const poos = [poo({ size: 'small' }), poo({ size: 'small' }), poo({ size: 'medium' }), poo({ size: 'large' })]
    expect(summarizePoos(poos)).toEqual({ total: 4, small: 2, medium: 1, large: 1 })
  })

  it('returns all zeros for an empty list', () => {
    expect(summarizePoos([])).toEqual({ total: 0, small: 0, medium: 0, large: 0 })
  })
})

describe('poosEarnedOn', () => {
  it('filters to poos earned on the given local calendar day', () => {
    const poos = [
      poo({ id: 'a', earnedAt: '2026-07-13T09:00:00.000Z' }),
      poo({ id: 'b', earnedAt: '2026-07-12T09:00:00.000Z' }),
    ]
    const result = poosEarnedOn(poos, '2026-07-13')
    expect(result.map((p) => p.id)).toEqual(['a'])
  })
})

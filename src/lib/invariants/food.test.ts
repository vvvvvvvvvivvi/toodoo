import { describe, expect, it } from 'vitest'
import { getFoodSize } from '@/lib/invariants/food'

describe('getFoodSize', () => {
  it('is a snack at or below 30 minutes', () => {
    expect(getFoodSize(0)).toBe('snack')
    expect(getFoodSize(30)).toBe('snack')
  })

  it('is a meal between 31 and 90 minutes', () => {
    expect(getFoodSize(31)).toBe('meal')
    expect(getFoodSize(90)).toBe('meal')
  })

  it('is a feast above 90 minutes', () => {
    expect(getFoodSize(91)).toBe('feast')
    expect(getFoodSize(500)).toBe('feast')
  })
})

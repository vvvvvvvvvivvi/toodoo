import { describe, expect, it } from 'vitest'
import { getPooSize } from '@/lib/invariants/poo'

describe('getPooSize', () => {
  it('maps snack-sized estimates to a small poo', () => {
    expect(getPooSize(15)).toBe('small')
  })

  it('maps meal-sized estimates to a medium poo', () => {
    expect(getPooSize(60)).toBe('medium')
  })

  it('maps feast-sized estimates to a large poo', () => {
    expect(getPooSize(120)).toBe('large')
  })

  it('sizes by original estimate, not remaining minutes (Invariant 6)', () => {
    // A 120-minute Feast nibbled down to 5 remaining minutes still pays out a large poo.
    expect(getPooSize(120)).toBe('large')
  })
})

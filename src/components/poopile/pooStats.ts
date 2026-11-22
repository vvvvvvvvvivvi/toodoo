import type { Poo } from '@/types/models'
import { localDateString } from '@/lib/utils/date'

export interface PooBreakdown {
  total: number
  small: number
  medium: number
  large: number
}

export function summarizePoos(poos: Poo[]): PooBreakdown {
  return {
    total: poos.length,
    small: poos.filter((p) => p.size === 'small').length,
    medium: poos.filter((p) => p.size === 'medium').length,
    large: poos.filter((p) => p.size === 'large').length,
  }
}

// Local-day filter (Invariant 12) — earnedAt is a UTC ISO datetime; convert
// to the local calendar day it actually fell on, not a naive string slice.
export function poosEarnedOn(poos: Poo[], date: string): Poo[] {
  return poos.filter((p) => localDateString(new Date(p.earnedAt)) === date)
}

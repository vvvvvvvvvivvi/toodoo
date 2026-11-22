import type { PooSize } from '@/types/models'
import { MEAL_MAX_MINUTES, SNACK_MAX_MINUTES } from '@/lib/invariants/sizeThresholds'

// Poo size maps from a task's ORIGINAL estimateMinutes, never remainingMinutes
// (Invariant 6) — completing a nearly-empty Feast still earns a large poo.
export function getPooSize(estimateMinutes: number): PooSize {
  if (estimateMinutes <= SNACK_MAX_MINUTES) return 'small'
  if (estimateMinutes <= MEAL_MAX_MINUTES) return 'medium'
  return 'large'
}

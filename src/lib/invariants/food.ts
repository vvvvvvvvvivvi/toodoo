import type { FoodSize } from '@/types/models'
import { MEAL_MAX_MINUTES, SNACK_MAX_MINUTES } from '@/lib/invariants/sizeThresholds'

// Derived food size, from a task's CURRENT remainingMinutes.
export function getFoodSize(remainingMinutes: number): FoodSize {
  if (remainingMinutes <= SNACK_MAX_MINUTES) return 'snack'
  if (remainingMinutes <= MEAL_MAX_MINUTES) return 'meal'
  return 'feast'
}

// Bite sizes offered when adding a task. Food names are flavour text only —
// the stored value is always minutes; the app's real snack/meal/feast sizing
// is derived from minutes elsewhere (lib/invariants/food).
export const PORTIONS: { label: string; minutes: number; emoji: string; caption: string }[] = [
  { label: '15m', minutes: 15, emoji: '🍓', caption: 'a nibble' },
  { label: '30m', minutes: 30, emoji: '🍪', caption: 'a snack' },
  { label: '1h', minutes: 60, emoji: '🥪', caption: 'a meal' },
  { label: '2h', minutes: 120, emoji: '🍗', caption: 'a feast' },
]

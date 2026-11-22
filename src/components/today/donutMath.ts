import type { Circle, Task } from '@/types/models'
import { isLocked } from '@/lib/invariants/lock'

export type SegmentKind = 'digested' | 'planned' | 'locked' | 'empty'

export interface DonutSegment {
  key: string
  kind: SegmentKind
  minutes: number
  start: number // fraction [0,1] along the full 360° sweep
  end: number // fraction [0,1]
}

// Digested (completed) tasks are sized by their ORIGINAL estimateMinutes —
// remainingMinutes is 0 once completed, but the wedge should still show how
// big a bite was actually taken (Invariant 6's poo-sizing logic, reused here
// purely for rendering, not persistence).
export function buildDonutSegments(circle: Circle, tasks: Task[], today: string): DonutSegment[] {
  const inCircle = tasks.filter((t) => t.circleId === circle.id)
  const completed = inCircle
    .filter((t) => t.state === 'completed')
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
  const planned = inCircle.filter((t) => t.state === 'planned').sort((a, b) => a.sortIndex - b.sortIndex)

  const withoutFractions: Omit<DonutSegment, 'start' | 'end'>[] = [
    ...completed.map((t) => ({ key: t.id, kind: 'digested' as const, minutes: t.estimateMinutes })),
    ...planned.map((t) => ({
      key: t.id,
      kind: (isLocked(t, today) ? 'locked' : 'planned') as SegmentKind,
      minutes: t.remainingMinutes,
    })),
  ]

  const used = withoutFractions.reduce((sum, s) => sum + s.minutes, 0)
  const emptyMinutes = Math.max(0, circle.stomachMinutes - used)
  if (emptyMinutes > 0) {
    withoutFractions.push({ key: 'empty', kind: 'empty', minutes: emptyMinutes })
  }

  // Rendering-only safety clamp: if planned/locked tasks transiently exceed
  // the stomach (e.g. an auto-planted overdue task before Phase 5's triage
  // modal can resolve it), scale the denominator up so the donut still draws
  // as a valid ≤360° sweep instead of overflowing past a full circle.
  const scale = Math.max(circle.stomachMinutes, used, 1)

  let cumulative = 0
  return withoutFractions.map((s) => {
    const start = cumulative / scale
    cumulative += s.minutes
    const end = cumulative / scale
    return { ...s, start, end }
  })
}

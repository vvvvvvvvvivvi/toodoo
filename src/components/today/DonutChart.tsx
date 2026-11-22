import { buildDonutSegments, type DonutSegment, type SegmentKind } from '@/components/today/donutMath'
import type { Circle, Task } from '@/types/models'
import { GooseFace } from '@/components/shared/Decor'

const RADIUS_OUTER = 115
const RADIUS_INNER = 68
const CENTER_X = 130
const CENTER_Y = 130
const VIEW_SIZE = 260

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [CENTER_X + radius * Math.cos(rad), CENTER_Y - radius * Math.sin(rad)]
}

// Fraction -> angle: 0 starts at 12 o'clock (90°), increasing fraction
// sweeps clockwise all the way around a full 360° circle.
function angleForFraction(fraction: number): number {
  return 90 - 360 * fraction
}

function ringSegmentPath(startFraction: number, endFraction: number): string {
  const span = (endFraction - startFraction) * 360
  // SVG can't express a true 360° sweep as one arc (start/end points would be
  // identical, which most renderers treat as an empty/invisible arc) — split
  // a full-circle segment into two half-circle arcs instead.
  if (span > 359.99) {
    const mid = startFraction + (endFraction - startFraction) / 2
    return `${ringSegmentPath(startFraction, mid)} ${ringSegmentPath(mid, endFraction)}`
  }

  const angleStart = angleForFraction(startFraction)
  const angleEnd = angleForFraction(endFraction)
  const [ox0, oy0] = polar(angleStart, RADIUS_OUTER)
  const [ox1, oy1] = polar(angleEnd, RADIUS_OUTER)
  const [ix1, iy1] = polar(angleEnd, RADIUS_INNER)
  const [ix0, iy0] = polar(angleStart, RADIUS_INNER)
  const largeArc = span > 180 ? 1 : 0
  return `M ${ox0} ${oy0} A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 ${largeArc} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${RADIUS_INNER} ${RADIUS_INNER} 0 ${largeArc} 0 ${ix0} ${iy0} Z`
}

const SEGMENT_CLASS: Record<SegmentKind, string> = {
  digested: 'fill-accent stroke-butter',
  planned: 'fill-primary stroke-butter',
  locked: 'fill-carrot stroke-butter',
  empty: 'fill-paper stroke-butter',
}

function LockMarker({ segment }: { segment: DonutSegment }) {
  const midAngle = angleForFraction((segment.start + segment.end) / 2)
  const midRadius = (RADIUS_OUTER + RADIUS_INNER) / 2
  const [x, y] = polar(midAngle, midRadius)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={16}>
      🔒
    </text>
  )
}

interface DonutChartProps {
  circle: Circle
  tasks: Task[]
  today: string
}

export function DonutChart({ circle, tasks, today }: DonutChartProps) {
  const segments = buildDonutSegments(circle, tasks, today)

  return (
    <div className="relative mx-auto w-full max-w-[220px] lg:max-w-[280px]">
      <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="w-full" role="img" aria-label="Today's Circle">
        {segments.map((s) => (
          <path
            key={s.key}
            d={ringSegmentPath(s.start, s.end)}
            className={SEGMENT_CLASS[s.kind]}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        ))}
        {segments.filter((s) => s.kind === 'locked').map((s) => (
          <LockMarker key={`${s.key}-lock`} segment={s} />
        ))}
      </svg>
      <GooseFace size={80}className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bob" />
    </div>
  )
}

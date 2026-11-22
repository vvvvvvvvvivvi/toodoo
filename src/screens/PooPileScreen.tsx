import { usePooStore } from '@/stores/usePooStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { localToday } from '@/lib/utils/date'
import { poosEarnedOn, summarizePoos, type PooBreakdown } from '@/components/poopile/pooStats'

// Visual-first: the count is *seen* (a cluster of poo emoji sized by
// category) rather than read off a "Small: 2 Medium: 1" text row.
function PooCluster({ breakdown }: { breakdown: PooBreakdown }) {
  if (breakdown.total === 0) {
    return <span className="font-body text-sm text-text-secondary">—</span>
  }
  return (
    <div className="flex flex-wrap items-end justify-center gap-1">
      {Array.from({ length: breakdown.small }).map((_, i) => (
        <span key={`s${i}`} className="text-lg leading-none">
          💩
        </span>
      ))}
      {Array.from({ length: breakdown.medium }).map((_, i) => (
        <span key={`m${i}`} className="text-2xl leading-none">
          💩
        </span>
      ))}
      {Array.from({ length: breakdown.large }).map((_, i) => (
        <span key={`l${i}`} className="text-4xl leading-none">
          💩
        </span>
      ))}
    </div>
  )
}

function BreakdownCard({ title, breakdown }: { title: string; breakdown: PooBreakdown }) {
  return (
    <div className="w-full rounded-2xl bg-circle-empty/50 p-4">
      <p className="mb-2 font-display text-sm text-text-primary">{title}</p>
      <PooCluster breakdown={breakdown} />
    </div>
  )
}

export function PooPileScreen() {
  const poos = usePooStore((s) => s.poos)
  const circles = useCircleStore((s) => s.circles)
  const today = localToday()
  const cleanPlateCount = circles.filter((c) => c.state === 'cleanPlate').length

  if (poos.length === 0 && cleanPlateCount === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-7xl">💩</span>
        <h1 className="font-display text-xl text-text-primary">Nothing digested yet. Get nibbling.</h1>
      </div>
    )
  }

  const allTime = summarizePoos(poos)
  const day = summarizePoos(poosEarnedOn(poos, today))

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="text-6xl">💩</span>
      <p className="font-display text-4xl text-text-primary">{allTime.total}</p>

      <BreakdownCard title="Today" breakdown={day} />
      <BreakdownCard title="All time" breakdown={allTime} />

      <div className="rounded-2xl bg-circle-empty px-6 py-4">
        <p className="font-display text-2xl text-text-primary">🏆 {cleanPlateCount}</p>
      </div>
    </div>
  )
}

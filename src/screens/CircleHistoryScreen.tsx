import { useCircleStore } from '@/stores/useCircleStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { getDigestedTasksFor, getPastCircles } from '@/components/history/circleHistory'
import { getPooSize } from '@/lib/invariants/poo'
import type { Circle } from '@/types/models'

const STATE_BADGE: Partial<Record<Circle['state'], string>> = {
  cleanPlate: '🏆 Clean plate',
  abandoned: '🤷 Abandoned',
  closed: '🌙 Closed out',
}

const POO_TEXT_SIZE: Record<ReturnType<typeof getPooSize>, string> = {
  small: 'text-sm',
  medium: 'text-lg',
  large: 'text-2xl',
}

function PooBadge({ estimateMinutes }: { estimateMinutes: number }) {
  return <span className={POO_TEXT_SIZE[getPooSize(estimateMinutes)]}>💩</span>
}

export function CircleHistoryScreen() {
  const circles = useCircleStore((s) => s.circles)
  const tasks = useTaskStore((s) => s.tasks)
  const pastCircles = getPastCircles(circles)

  if (pastCircles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-7xl">🗓️</span>
        <h1 className="font-display text-xl text-text-primary">No circles finished yet.</h1>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {pastCircles.map((circle) => {
        const digested = getDigestedTasksFor(circle.id, tasks)
        return (
          <div key={circle.id} className="rounded-2xl bg-circle-empty/50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-sm text-text-primary">{circle.date}</p>
              <span className="font-body text-xs text-text-secondary">{STATE_BADGE[circle.state]}</span>
            </div>
            <p className="mb-2 font-body text-xs text-text-secondary">{circle.stomachMinutes}m stomach</p>
            {digested.length === 0 ? (
              <p className="font-body text-sm text-text-secondary">Nothing digested this one.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {digested.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 font-body text-sm text-text-primary">
                    <PooBadge estimateMinutes={task.estimateMinutes} />
                    {task.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { getFillMyDaySuggestions } from '@/lib/invariants/fillMyDay'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import { dismissFillMyDay } from '@/lib/mutations/settingsMutations'
import type { Task } from '@/types/models'
import { Washi } from '@/components/shared/Decor'

interface FillMyDayTrayProps {
  circleId: string
  backlogTasks: Task[]
  gapMinutes: number
  today: string
}

export function FillMyDayTray({ circleId, backlogTasks, gapMinutes, today }: FillMyDayTrayProps) {
  const suggestions = getFillMyDaySuggestions(backlogTasks, gapMinutes)
  if (suggestions.length === 0) return null

  return (
    <div className="card relative flex flex-col gap-2 border-2 border-dashed border-butter-deep bg-paper pt-5">
      <Washi className="absolute -top-2.5 left-1/2 -translate-x-1/2" rotate={3} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="hand-label text-lg">snack ideas:</h2>
          <p className="font-hand text-base font-bold text-text-secondary">
            The goose is still hungry — {gapMinutes}m to go:
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissFillMyDay(today)}
          aria-label="Dismiss Fill My Day suggestions"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper/70 font-display text-sm text-text-secondary"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((task, i) => (
          <button
            key={task.id}
            type="button"
            onClick={() => attemptCapacityMutation({ kind: 'addTaskToCircle', circleId, taskId: task.id })}
            className="chip animate-pop-in hover:-rotate-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            + {task.title} · {task.remainingMinutes}m
          </button>
        ))}
      </div>
    </div>
  )
}

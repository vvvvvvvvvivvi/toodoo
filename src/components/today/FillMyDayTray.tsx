import { X } from 'lucide-react'
import { getFillMyDaySuggestions } from '@/lib/invariants/fillMyDay'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import { dismissFillMyDay } from '@/lib/mutations/settingsMutations'
import type { Task } from '@/types/models'

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
    <div className="mx-4 mb-2 flex flex-col gap-2 rounded-2xl bg-circle-empty/60 p-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-text-primary">The goose is still hungry — {gapMinutes}m to go:</p>
        <button
          type="button"
          onClick={() => dismissFillMyDay(today)}
          aria-label="Dismiss Fill My Day suggestions"
          className="p-1 text-text-secondary"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => attemptCapacityMutation({ kind: 'addTaskToCircle', circleId, taskId: task.id })}
            className="rounded-2xl bg-background px-3 py-1.5 font-body text-sm text-text-primary"
          >
            {task.title} · {task.remainingMinutes}m
          </button>
        ))}
      </div>
    </div>
  )
}

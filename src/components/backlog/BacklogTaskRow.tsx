import { CalendarPlus, Trash2 } from 'lucide-react'
import type { Task } from '@/types/models'
import { getFoodSize } from '@/lib/invariants/food'
import { TagChips } from '@/components/shared/TagChips'

const FOOD_EMOJI = {
  snack: '🍪',
  meal: '🥪',
  feast: '🍗',
} as const

interface BacklogTaskRowProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onAddToToday?: (taskId: string) => void
}

export function BacklogTaskRow({ task, onEdit, onDelete, onAddToToday }: BacklogTaskRowProps) {
  const emoji = FOOD_EMOJI[getFoodSize(task.remainingMinutes)]

  return (
    <div className="flex items-center gap-3 card px-4 py-3">
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span className="text-2xl">{emoji}</span>
        <span className="flex flex-1 flex-col">
          <span className="font-body text-text-primary">{task.title}</span>
          <span className="font-body text-xs text-text-secondary">
            {task.estimateMinutes}m{task.deadline ? ` · due ${task.deadline}` : ''}
          </span>
          <TagChips tags={task.tags} />
        </span>
      </button>
      {onAddToToday && (
        <button
          type="button"
          onClick={() => onAddToToday(task.id)}
          aria-label={`Add ${task.title} to today`}
          className="p-2 text-primary"
        >
          <CalendarPlus size={18} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete ${task.title}`}
        className="p-2 text-text-secondary"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

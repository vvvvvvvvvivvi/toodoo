import { useState } from 'react'
import { Check, Lock, Pencil, Timer, Trash2, Undo2 } from 'lucide-react'
import type { Task } from '@/types/models'
import { getFoodSize } from '@/lib/invariants/food'
import { isLocked } from '@/lib/invariants/lock'
import { completeTask, deleteTask, returnToBacklog } from '@/lib/mutations/taskMutations'
import { playHonk } from '@/lib/audio/honk'
import { TagChips } from '@/components/shared/TagChips'

const COMPLETE_PULSE_MS = 200

const FOOD_EMOJI = {
  snack: '🍪',
  meal: '🥪',
  feast: '🍗',
} as const

interface TaskRowProps {
  task: Task
  today: string
  onNibble: (task: Task) => void
  onEdit: (task: Task) => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
}

export function TaskRow({ task, today, onNibble, onEdit, onDragStart, onDragOver, onDrop }: TaskRowProps) {
  const locked = isLocked(task, today)
  const [shake, setShake] = useState(false)
  const [completing, setCompleting] = useState(false)
  const emoji = FOOD_EMOJI[getFoodSize(task.remainingMinutes)]

  function shakeAndRefuse() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  async function handleReturnToBacklog() {
    if (locked) {
      shakeAndRefuse()
      return
    }
    await returnToBacklog(task.id, today)
  }

  async function handleDelete() {
    if (locked) {
      shakeAndRefuse()
      return
    }
    await deleteTask(task.id, today)
  }

  // Micro-animation + honk on completion (design tokens spec): play the cue
  // immediately, then hold for one short pulse before the row actually
  // leaves the planned list — otherwise the state flip removes it too fast
  // to see any animation at all.
  function handleComplete() {
    if (completing) return
    setCompleting(true)
    playHonk()
    setTimeout(() => {
      completeTask(task.id)
    }, COMPLETE_PULSE_MS)
  }

  return (
    <div
      draggable={!locked}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDrop={onDrop}
      className={`flex items-center gap-1 rounded-2xl px-3 py-2 ${
        locked ? 'border-2 border-primary bg-background' : 'bg-circle-empty/50'
      } ${shake ? 'animate-shake' : ''} ${completing ? 'animate-complete-pulse' : ''}`}
    >
      <span className="text-xl">{emoji}</span>
      <div className="flex-1">
        <p className="flex items-center gap-1 font-body text-text-primary">
          {task.title}
          {locked && <Lock size={12} className="text-primary" />}
        </p>
        <p className="font-body text-xs text-text-secondary">{task.remainingMinutes}m left</p>
        <TagChips tags={task.tags} />
      </div>
      <button type="button" onClick={() => onNibble(task)} aria-label={`Nibble ${task.title}`} className="p-1.5 text-text-secondary">
        <Timer size={18} />
      </button>
      <button
        type="button"
        onClick={handleComplete}
        disabled={completing}
        aria-label={`Complete ${task.title}`}
        className="p-1.5 text-accent"
      >
        <Check size={18} />
      </button>
      <button
        type="button"
        onClick={handleReturnToBacklog}
        aria-label={`Return ${task.title} to backlog`}
        className={`p-1.5 ${locked ? 'text-text-secondary/40' : 'text-text-secondary'}`}
      >
        <Undo2 size={18} />
      </button>
      <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} className="p-1.5 text-text-secondary">
        <Pencil size={18} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label={`Delete ${task.title}`}
        className={`p-1.5 ${locked ? 'text-text-secondary/40' : 'text-text-secondary'}`}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

import { useState } from 'react'
import { Check, Lock } from 'lucide-react'
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
  open?: boolean
  onToggle?: () => void
  onNibble: (task: Task) => void
  onEdit: (task: Task) => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
}

// A planner line: a hand-drawn checkbox to gobble the task, and tapping the
// task itself pops open a little tray of sticker actions.
export function TaskRow({ task, today, open = false, onToggle, onNibble, onEdit, onDragStart, onDragOver, onDrop }: TaskRowProps) {
  const locked = isLocked(task, today)
  const [shake, setShake] = useState(false)
  const [completing, setCompleting] = useState(false)
  const foodSize = getFoodSize(task.remainingMinutes)

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

  // Micro-animation + honk on completion: play the cue immediately, then
  // hold for one short pulse before the row actually leaves the planned
  // list — otherwise the state flip removes it too fast to see.
  function handleComplete() {
    if (completing) return
    setCompleting(true)
    playHonk()
    setTimeout(() => {
      completeTask(task.id)
    }, COMPLETE_PULSE_MS)
  }

  const action = 'chip flex items-center gap-1 py-1 font-hand text-base font-bold'

  return (
    <div
      draggable={!locked}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDrop={onDrop}
      className={`rounded-[20px] px-3 py-2 transition-colors ${
        locked ? 'border-2 border-dashed border-primary bg-paper' : 'bg-paper/80'
      } ${shake ? 'animate-shake' : ''} ${completing ? 'animate-complete-pulse' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          aria-label={`Complete ${task.title}`}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-all ${
            completing
              ? 'animate-pop-in border-accent bg-accent text-paper'
              : 'border-text-primary/70 text-transparent hover:border-accent hover:text-accent'
          }`}
          style={{ borderRadius: '52% 48% 50% 50% / 48% 52% 48% 52%' }}
        >
          <Check size={16} strokeWidth={3.5} />
        </button>

        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 flex-col text-left">
          <p className="flex items-center gap-1 font-body text-[15px] font-bold text-text-primary md:text-base">
            {task.title}
            {locked && <Lock size={13} className="shrink-0 text-primary" />}
          </p>
          <p className="font-hand text-base font-bold leading-tight text-text-secondary">
            {task.remainingMinutes}m left{locked ? ' · due today!' : ''}
          </p>
          <TagChips tags={task.tags} />
        </button>

        <span className="shrink-0 text-2xl" title={foodSize}>
          {FOOD_EMOJI[foodSize]}
        </span>
      </div>

      {open && (
        <div className="mt-2 flex animate-reveal flex-wrap gap-1.5 pl-10">
          <button type="button" onClick={() => onNibble(task)} aria-label={`Nibble ${task.title}`} className={action}>
            🍴 nibble
          </button>
          <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} className={action}>
            ✏️ edit
          </button>
          <button
            type="button"
            onClick={handleReturnToBacklog}
            aria-label={`Return ${task.title} to backlog`}
            className={`${action} ${locked ? 'opacity-40' : ''}`}
          >
            🥫 not today
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Delete ${task.title}`}
            className={`${action} ${locked ? 'opacity-40' : ''}`}
          >
            🗑️ toss
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { EstimateChips } from '@/components/backlog/EstimateChips'
import type { Task } from '@/types/models'

const PRESET_MINUTES = [15, 30, 60, 120]

export interface TaskFormValues {
  title: string
  estimateMinutes: number
  deadline?: string
  tags?: string[]
}

function parseTags(input: string): string[] {
  const seen = new Set<string>()
  for (const raw of input.split(',')) {
    const tag = raw.trim()
    if (tag) seen.add(tag)
  }
  return Array.from(seen)
}

interface AddTaskSheetProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  initialTask?: Task
  onSubmit: (input: TaskFormValues) => Promise<void>
}

export function AddTaskSheet({ open, onClose, mode, initialTask, onSubmit }: AddTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('30')
  const [deadline, setDeadline] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initialTask) {
      setTitle(initialTask.title)
      const isPreset = PRESET_MINUTES.includes(initialTask.estimateMinutes)
      setIsCustom(!isPreset)
      setMinutes(initialTask.estimateMinutes)
      setCustomValue(String(initialTask.estimateMinutes))
      setDeadline(initialTask.deadline ?? '')
      setTagsInput((initialTask.tags ?? []).join(', '))
    } else {
      setTitle('')
      setIsCustom(false)
      setMinutes(30)
      setCustomValue('30')
      setDeadline('')
      setTagsInput('')
    }
    setError(null)
  }, [open, initialTask])

  const effectiveMinutes = isCustom ? Number(customValue) : minutes

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Give it a name, the goose needs to know what it is.')
      return
    }
    if (!Number.isFinite(effectiveMinutes) || effectiveMinutes <= 0) {
      setError('Estimate must be a positive number of minutes.')
      return
    }
    try {
      await onSubmit({
        title,
        estimateMinutes: effectiveMinutes,
        deadline: deadline || undefined,
        tags: parseTags(tagsInput),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'add' ? 'Add a task' : 'Edit task'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-text-secondary">Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="rounded-xl border border-circle-empty bg-background px-3 py-2 font-body text-text-primary"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-body text-sm text-text-secondary">Estimate</span>
          <EstimateChips
            minutes={minutes}
            isCustom={isCustom}
            onSelectPreset={(m) => {
              setIsCustom(false)
              setMinutes(m)
            }}
            onSelectCustom={() => setIsCustom(true)}
          />
          {isCustom && (
            <input
              type="number"
              min={1}
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Minutes"
              className="mt-2 w-28 rounded-xl border border-circle-empty bg-background px-3 py-2 font-body text-text-primary"
            />
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-text-secondary">Deadline (optional)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-xl border border-circle-empty bg-background px-3 py-2 font-body text-text-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-text-secondary">Tags (optional, comma-separated)</span>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="work, urgent"
            className="rounded-xl border border-circle-empty bg-background px-3 py-2 font-body text-text-primary"
          />
        </label>

        {error && <p className="font-body text-sm text-warning">{error}</p>}

        <button type="submit" className="rounded-2xl bg-primary px-4 py-3 font-display text-base text-background">
          {mode === 'add' ? 'Add to backlog' : 'Save changes'}
        </button>
      </form>
    </Sheet>
  )
}

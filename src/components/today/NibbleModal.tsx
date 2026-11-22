import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import type { Task } from '@/types/models'

interface NibbleModalProps {
  task: Task | null
  onClose: () => void
  onSubmit: (taskId: string, minutes: number) => Promise<void>
}

export function NibbleModal({ task, onClose, onSubmit }: NibbleModalProps) {
  const [value, setValue] = useState('10')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue('10')
    setError(null)
  }, [task?.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!task) return
    const minutes = Number(value)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError('Enter a positive number of minutes.')
      return
    }
    await onSubmit(task.id, minutes)
    onClose()
  }

  return (
    <Sheet open={task !== null} onClose={onClose} title={task ? `Nibble at "${task.title}"` : 'Nibble'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-text-secondary">Minutes worked</span>
          <input
            autoFocus
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-xl border border-circle-empty bg-background px-3 py-2 font-body text-text-primary"
          />
        </label>
        {error && <p className="font-body text-sm text-warning">{error}</p>}
        <button type="submit" className="rounded-2xl bg-primary px-4 py-3 font-display text-base text-background">
          Nibble
        </button>
      </form>
    </Sheet>
  )
}

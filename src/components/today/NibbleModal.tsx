import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import type { Task } from '@/types/models'

const QUICK_NIBBLES = [10, 15, 30, 45]

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
        <p className="font-hand text-lg font-bold text-text-secondary">chipped away at it? every crumb counts 🍴</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_NIBBLES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setValue(String(m))}
              className={`chip ${value === String(m) ? 'chip-on' : ''}`}
            >
              {m}m
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3">
          <span className="hand-label text-base">Minutes worked</span>
          <input
            autoFocus
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-cute w-24 text-center font-display text-lg"
          />
        </label>
        {error && <p className="font-hand text-lg font-bold text-warning">{error}</p>}
        <button type="submit" className="btn-main text-lg">
          Nibble
        </button>
      </form>
    </Sheet>
  )
}

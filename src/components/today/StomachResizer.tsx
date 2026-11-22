import { useState, type FormEvent } from 'react'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'

interface StomachResizerProps {
  circleId: string
  stomachMinutes: number
}

export function StomachResizer({ circleId, stomachMinutes }: StomachResizerProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(stomachMinutes))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const minutes = Number(value)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    await attemptCapacityMutation({ kind: 'shrinkStomach', circleId, newStomachMinutes: minutes })
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(stomachMinutes))
          setEditing(true)
        }}
        className="font-body text-sm text-text-secondary underline decoration-dotted"
      >
        {stomachMinutes}m stomach
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        autoFocus
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded-lg border border-circle-empty bg-background px-2 py-1 text-right font-body text-sm"
      />
      <button type="submit" className="rounded-lg bg-primary px-2 py-1 font-body text-xs text-background">
        Set
      </button>
    </form>
  )
}

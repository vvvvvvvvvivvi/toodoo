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
        className="rounded-full bg-paper/70 px-3 py-0.5 font-display text-base font-semibold text-text-primary"
      >
        {stomachMinutes}m stomach
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex animate-pop-in items-center gap-1">
      <input
        autoFocus
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Stomach minutes"
        className="w-16 rounded-full bg-paper px-2 py-0.5 text-right font-display text-base outline-none ring-2 ring-primary"
      />
      <button type="submit" className="rounded-full bg-primary px-3 py-0.5 font-hand text-base font-bold">
        set
      </button>
    </form>
  )
}

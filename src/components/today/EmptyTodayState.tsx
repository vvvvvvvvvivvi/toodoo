import { useState } from 'react'
import { createCircle } from '@/lib/mutations/circleMutations'
import { useSettingsStore } from '@/stores/useSettingsStore'

const STOMACH_PRESETS = [
  { label: '4h', minutes: 240 },
  { label: '6h', minutes: 360 },
  { label: '8h', minutes: 480 },
  { label: '10h', minutes: 600 },
]

interface EmptyTodayStateProps {
  today: string
  anotherHelping?: boolean
}

export function EmptyTodayState({ today, anotherHelping = false }: EmptyTodayStateProps) {
  const defaultStomachMinutes = useSettingsStore((s) => s.settings.defaultStomachMinutes)
  const defaultIsPreset = STOMACH_PRESETS.some((p) => p.minutes === defaultStomachMinutes)

  const [minutes, setMinutes] = useState(defaultStomachMinutes)
  const [isCustom, setIsCustom] = useState(!defaultIsPreset)
  const [customValue, setCustomValue] = useState(String(defaultStomachMinutes))
  const [error, setError] = useState<string | null>(null)

  const effectiveMinutes = isCustom ? Number(customValue) : minutes

  async function handleStart() {
    if (!Number.isFinite(effectiveMinutes) || effectiveMinutes <= 0) {
      setError('Pick a positive number of hours.')
      return
    }
    try {
      await createCircle(today, effectiveMinutes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-5xl">🪿</span>
      <h1 className="font-display text-2xl text-text-primary">
        {anotherHelping ? 'Another helping?' : 'How many hours have we got?'}
      </h1>

      <div className="flex flex-wrap justify-center gap-2">
        {STOMACH_PRESETS.map((preset) => {
          const active = !isCustom && minutes === preset.minutes
          return (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => {
                setIsCustom(false)
                setMinutes(preset.minutes)
              }}
              className={`rounded-2xl px-4 py-2 font-body text-sm ${
                active ? 'bg-primary text-background' : 'bg-circle-empty text-text-primary'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={`rounded-2xl px-4 py-2 font-body text-sm ${
            isCustom ? 'bg-primary text-background' : 'bg-circle-empty text-text-primary'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <input
          type="number"
          min={1}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Minutes"
          className="w-32 rounded-xl border border-circle-empty bg-background px-3 py-2 text-center font-body text-text-primary"
        />
      )}

      {error && <p className="font-body text-sm text-warning">{error}</p>}

      <button
        type="button"
        onClick={handleStart}
        className="rounded-2xl bg-primary px-6 py-3 font-display text-base text-background"
      >
        Let's go
      </button>
    </div>
  )
}

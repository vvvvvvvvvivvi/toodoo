import { useState } from 'react'
import { createCircle } from '@/lib/mutations/circleMutations'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { GooseFace, Sparkle } from '@/components/shared/Decor'

const STOMACH_PRESETS = [
  { label: '4h', minutes: 240, caption: 'light lunch' },
  { label: '6h', minutes: 360, caption: 'proper meal' },
  { label: '8h', minutes: 480, caption: 'big dinner' },
  { label: '10h', minutes: 600, caption: 'banquet!' },
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

  const bubble = (active: boolean) =>
    `flex flex-col items-center rounded-[24px] border-2 px-3 py-2 transition-all duration-200 ${
      active
        ? '-translate-y-1 -rotate-2 border-primary-deep bg-primary shadow-[0_4px_0_var(--color-primary-deep)]'
        : 'border-butter-deep bg-paper hover:-translate-y-0.5'
    }`

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="relative flex h-44 w-56 items-center justify-center md:h-64 md:w-80">
        <div className="blob absolute inset-0 bg-butter" />
        <Sparkle size={26} className="absolute -left-1 top-3" />
        <Sparkle size={18} className="absolute right-1 top-0" delay={0.8} />
        <Sparkle size={20} className="absolute bottom-2 right-3" delay={1.4} />
        <GooseFace size={120} className="relative animate-bob md:size-[170px]" />
      </div>

      <h1 className="hand-label text-3xl leading-tight md:text-5xl">
        {anotherHelping ? 'Another helping?' : 'How many hours have we got?'}
      </h1>
      <p className="-mt-3 font-hand text-lg font-bold text-text-secondary">that's how big my tummy is today</p>

      <div className="grid grid-cols-5 gap-2 md:gap-3 md:[&>button]:w-28 md:[&>button]:py-3">
        {STOMACH_PRESETS.map((preset) => {
          const active = !isCustom && minutes === preset.minutes
          return (
            <button
              key={preset.minutes}
              type="button"
              aria-label={preset.label}
              aria-pressed={active}
              onClick={() => {
                setIsCustom(false)
                setMinutes(preset.minutes)
              }}
              className={bubble(active)}
            >
              <span className="font-display text-lg font-semibold">{preset.label}</span>
              <span className={`font-hand text-xs font-bold leading-none ${active ? 'text-text-primary/75' : 'text-text-secondary'}`}>{preset.caption}</span>
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Custom"
          aria-pressed={isCustom}
          onClick={() => setIsCustom(true)}
          className={bubble(isCustom)}
        >
          <span className="font-display text-lg">✏️</span>
          <span className="font-hand text-xs font-bold leading-none text-text-secondary">other</span>
        </button>
      </div>

      {isCustom && (
        <label className="flex animate-reveal items-baseline gap-2">
          <input
            type="number"
            min={1}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Minutes"
            className="input-cute w-28 text-center font-display text-lg"
          />
          <span className="font-hand text-lg font-bold text-text-secondary">minutes</span>
        </label>
      )}

      {error && <p className="font-hand text-lg font-bold text-warning">{error}</p>}

      <button type="button" onClick={handleStart} className="btn-main px-10 text-lg">
        Let's go! 🍽️
      </button>
    </div>
  )
}

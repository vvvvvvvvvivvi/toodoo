const PRESETS: { label: string; minutes: number }[] = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
]

interface EstimateChipsProps {
  minutes: number
  isCustom: boolean
  onSelectPreset: (minutes: number) => void
  onSelectCustom: () => void
}

export function EstimateChips({ minutes, isCustom, onSelectPreset, onSelectCustom }: EstimateChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => {
        const active = !isCustom && minutes === preset.minutes
        return (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => onSelectPreset(preset.minutes)}
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
        onClick={onSelectCustom}
        className={`rounded-2xl px-4 py-2 font-body text-sm ${
          isCustom ? 'bg-primary text-background' : 'bg-circle-empty text-text-primary'
        }`}
      >
        Custom
      </button>
    </div>
  )
}

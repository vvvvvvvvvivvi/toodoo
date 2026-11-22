import { Pencil } from 'lucide-react'
import { PORTIONS } from '@/components/backlog/portions'

interface EstimateChipsProps {
  minutes: number
  isCustom: boolean
  onSelectPreset: (minutes: number) => void
  onSelectCustom: () => void
}

export function EstimateChips({ minutes, isCustom, onSelectPreset, onSelectCustom }: EstimateChipsProps) {
  const cardClass = (active: boolean) =>
    `flex flex-col items-center gap-0.5 rounded-[22px] border-2 px-1 py-2 transition-all duration-200 ${
      active
        ? '-translate-y-1 -rotate-2 border-text-primary bg-butter-deep shadow-[0_3px_0_var(--color-text-primary)]'
        : 'border-butter-deep bg-paper hover:-translate-y-0.5'
    }`

  return (
    <div className="grid grid-cols-5 gap-2">
      {PORTIONS.map((p) => {
        const active = !isCustom && minutes === p.minutes
        return (
          <button
            key={p.minutes}
            type="button"
            aria-pressed={active}
            aria-label={p.label}
            onClick={() => onSelectPreset(p.minutes)}
            className={cardClass(active)}
          >
            <span className={`text-2xl ${active ? 'animate-wiggle' : ''}`}>{p.emoji}</span>
            <span className="font-display text-sm font-semibold text-text-primary">{p.label}</span>
            <span className={`font-hand text-xs font-bold leading-none ${active ? 'text-text-primary/75' : 'text-text-secondary'}`}>{p.caption}</span>
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={isCustom}
        aria-label="Custom"
        onClick={onSelectCustom}
        className={cardClass(isCustom)}
      >
        <Pencil size={22} strokeWidth={2.4} className={`my-0.5 text-text-primary ${isCustom ? 'animate-wiggle' : ''}`} />
        <span className="font-display text-sm font-semibold text-text-primary">other</span>
        <span className="font-hand text-xs font-bold leading-none text-text-secondary">you pick</span>
      </button>
    </div>
  )
}

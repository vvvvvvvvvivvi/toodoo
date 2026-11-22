import type { DayReflection } from '@/types/models'

type Mood = NonNullable<DayReflection['mood']>

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'bad', emoji: '🥲', label: 'Bad' },
  { mood: 'okay', emoji: '😌', label: 'Okay' },
  { mood: 'good', emoji: '🥳', label: 'Good' },
]

interface MoodPickerProps {
  selected?: Mood
  onPick: (mood: Mood) => void
}

export function MoodPicker({ selected, onPick }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="hand-label text-lg">How'd it feel?</h3>
      <div className="flex justify-around">
        {MOODS.map(({ mood, emoji, label }) => {
          const active = selected === mood
          return (
            <button
              key={mood}
              type="button"
              onClick={() => onPick(mood)}
              aria-label={label}
              aria-pressed={active}
              className={`flex w-20 flex-col items-center gap-1 rounded-[24px] border-2 py-2 transition-all ${
                active
                  ? '-translate-y-1 -rotate-3 border-text-primary bg-butter-deep shadow-[0_3px_0_var(--color-text-primary)]'
                  : 'border-butter-deep bg-paper'
              }`}
            >
              <span className={`text-3xl ${active ? 'animate-wiggle' : ''}`}>{emoji}</span>
              <span className="font-hand text-base font-bold lowercase text-text-secondary">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import type { DayReflection } from '@/types/models'

type Mood = NonNullable<DayReflection['mood']>

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'bad', emoji: '😞', label: 'Bad' },
  { mood: 'okay', emoji: '😐', label: 'Okay' },
  { mood: 'good', emoji: '😊', label: 'Good' },
]

interface MoodPickerProps {
  selected?: Mood
  onPick: (mood: Mood) => void
}

export function MoodPicker({ selected, onPick }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm text-text-primary">How'd it feel?</h3>
      <div className="flex justify-around">
        {MOODS.map(({ mood, emoji, label }) => (
          <button
            key={mood}
            type="button"
            onClick={() => onPick(mood)}
            aria-label={label}
            className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-2 ${
              selected === mood ? 'bg-primary' : 'bg-circle-empty'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="font-body text-xs text-text-secondary">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

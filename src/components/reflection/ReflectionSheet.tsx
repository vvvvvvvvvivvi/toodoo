import { useState } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { MoodPicker } from '@/components/reflection/MoodPicker'
import { PinToTomorrowButton } from '@/components/reflection/PinToTomorrowButton'
import { useUIStore } from '@/stores/useUIStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { localToday } from '@/lib/utils/date'
import { saveReflectionMood } from '@/lib/mutations/reflectionMutations'
import type { DayReflection } from '@/types/models'

export function ReflectionSheet() {
  const pendingReflection = useUIStore((s) => s.pendingReflection)
  const summaries = useUIStore((s) => s.reflectionSummaries)
  const closeReflection = useUIStore((s) => s.closeReflection)
  const tasks = useTaskStore((s) => s.tasks)
  const [selectedMood, setSelectedMood] = useState<NonNullable<DayReflection['mood']> | undefined>()

  if (!pendingReflection) return null

  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const digestedCount = summaries.reduce((sum, s) => sum + s.digestedTaskIds.length, 0)
  const pantryTaskIds = summaries.flatMap((s) => s.pantryTaskIds)
  const pantryCount = pantryTaskIds.length

  // Copy rules: never guilt-trip — both outcomes are neutral events.
  const headline =
    pantryCount === 0
      ? 'HONK. Fully digested. Come admire the pile.'
      : `${digestedCount} digested, ${pantryCount} back in the pantry for later. No judgement. Some honking.`

  const today = localToday()

  async function handlePickMood(mood: NonNullable<DayReflection['mood']>) {
    setSelectedMood(mood)
    await saveReflectionMood(today, mood)
  }

  return (
    <Sheet open title="How'd today go?" onClose={closeReflection}>
      <div className="flex flex-col gap-5">
        <p className="font-body text-text-primary">{headline}</p>

        {pantryCount > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-sm text-text-primary">Back in the pantry</h3>
            {pantryTaskIds.map((taskId) => {
              const task = taskById.get(taskId)
              if (!task) return null
              return <PinToTomorrowButton key={taskId} taskId={taskId} title={task.title} />
            })}
          </div>
        )}

        <MoodPicker selected={selectedMood} onPick={handlePickMood} />

        <button
          type="button"
          onClick={closeReflection}
          className="rounded-2xl bg-primary px-4 py-3 font-display text-base text-background"
        >
          Done
        </button>
      </div>
    </Sheet>
  )
}

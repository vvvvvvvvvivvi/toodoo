import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useReflectionStore } from '@/stores/useReflectionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'
import { getCirclesNeedingClosure } from '@/lib/invariants/dayEnd'
import { endCircle } from '@/lib/invariants/circleLifecycle'
import { addDays, localToday } from '@/lib/utils/date'
import { updateTaskDeadline } from '@/lib/mutations/taskMutations'
import type { Circle, DayReflection } from '@/types/models'

export interface CircleReflectionSummary {
  circleId: string
  date: string
  digestedTaskIds: string[]
  pantryTaskIds: string[]
}

// Invariant 11: close every stale/past-day-end circle, release their
// incomplete tasks to backlog (Invariant 8), and record a DayReflection per
// affected date so the reflection sheet can show a fed-vs-digested summary.
//
// The digested/pantry task IDs are captured HERE, before endCircle clears
// circleId off the released tasks — once that happens there's no persisted
// way to tell which circle a backlog task came from, and DayReflection's
// shape (date, mood, circleIds) intentionally matches the spec's core model
// exactly, with no room for a summary. So the summary lives only in
// useUIStore (ephemeral), fresh every time this function runs.
export async function closeDueCirclesAndReflect(now: Date = new Date()): Promise<CircleReflectionSummary[]> {
  const settings = useSettingsStore.getState().settings
  const circles = useCircleStore.getState().circles
  const needingClosure = getCirclesNeedingClosure(circles, settings, now)
  if (needingClosure.length === 0) return []

  const nowIso = now.toISOString()
  let tasks = useTaskStore.getState().tasks
  const updatedCircles: Circle[] = []
  const summaries: CircleReflectionSummary[] = []

  for (const circle of needingClosure) {
    const digestedTaskIds = tasks
      .filter((t) => t.circleId === circle.id && t.state === 'completed')
      .map((t) => t.id)

    const { circle: ended, releasedTasks } = endCircle(circle, tasks, 'closed', nowIso)
    updatedCircles.push(ended)
    tasks = tasks.map((t) => releasedTasks.find((r) => r.id === t.id) ?? t)

    summaries.push({
      circleId: circle.id,
      date: circle.date,
      digestedTaskIds,
      pantryTaskIds: releasedTasks.map((t) => t.id),
    })
  }

  const finalCircles = circles.map((c) => updatedCircles.find((u) => u.id === c.id) ?? c)

  const byDate = new Map<string, string[]>()
  for (const c of updatedCircles) {
    byDate.set(c.date, [...(byDate.get(c.date) ?? []), c.id])
  }

  const reflections = useReflectionStore.getState().reflections
  const nextReflections: DayReflection[] = reflections.map((r) => ({ ...r }))
  for (const [date, circleIds] of byDate) {
    const idx = nextReflections.findIndex((r) => r.date === date)
    if (idx >= 0) {
      nextReflections[idx] = {
        ...nextReflections[idx],
        circleIds: Array.from(new Set([...nextReflections[idx].circleIds, ...circleIds])),
      }
    } else {
      nextReflections.push({ date, circleIds })
    }
  }

  await db.transaction('rw', db.tasks, db.circles, db.reflections, async () => {
    await db.tasks.bulkPut(tasks)
    await db.circles.bulkPut(updatedCircles)
    await db.reflections.bulkPut(nextReflections)
  })

  useTaskStore.getState().setAll(tasks)
  useCircleStore.getState().setAll(finalCircles)
  useReflectionStore.getState().setAll(nextReflections)
  useUIStore.getState().setPendingReflection(true)
  useUIStore.getState().setReflectionSummaries(summaries)

  return summaries
}

export async function saveReflectionMood(date: string, mood: NonNullable<DayReflection['mood']>): Promise<void> {
  const reflections = useReflectionStore.getState().reflections
  const existing = reflections.find((r) => r.date === date)
  const updated: DayReflection = existing ? { ...existing, mood } : { date, mood, circleIds: [] }
  const nextReflections = existing
    ? reflections.map((r) => (r.date === date ? updated : r))
    : [...reflections, updated]

  await db.reflections.put(updated)
  useReflectionStore.getState().setAll(nextReflections)
}

// One-tap "pin to tomorrow": sets the task's deadline to tomorrow's local
// date. This reuses Invariant 2's auto-plan mechanism — when tomorrow's
// first Circle is created, autoPlanDueTasks picks it straight up.
export async function pinToTomorrow(taskId: string, now: Date = new Date()): Promise<void> {
  const tomorrow = addDays(localToday(now), 1)
  await updateTaskDeadline(taskId, tomorrow)
}

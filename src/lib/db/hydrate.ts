import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import type { Circle, DayReflection, Poo, SettingsRecord, Task } from '@/types/models'

export interface HydratedState {
  tasks: Task[]
  circles: Circle[]
  poos: Poo[]
  reflections: DayReflection[]
  settings: SettingsRecord
}

// Phase 1: reads whatever is persisted and seeds default settings if missing.
// Day-boundary catch-up (closing stale circles, firing the reflection sheet) is Phase 7.
export async function hydrateAll(): Promise<HydratedState> {
  const [tasks, circles, poos, reflections, existingSettings] = await Promise.all([
    db.tasks.toArray(),
    db.circles.toArray(),
    db.poos.toArray(),
    db.reflections.toArray(),
    db.settings.get(DEFAULT_SETTINGS.id),
  ])

  const settings = existingSettings ?? DEFAULT_SETTINGS
  if (!existingSettings) {
    await db.settings.put(settings)
  }

  return { tasks, circles, poos, reflections, settings }
}

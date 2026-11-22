import { db } from '@/lib/db/db'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { SettingsRecord } from '@/types/models'

export async function updateSettings(patch: Partial<SettingsRecord>): Promise<void> {
  const updated: SettingsRecord = { ...useSettingsStore.getState().settings, ...patch }
  await db.settings.put(updated)
  useSettingsStore.getState().update(patch)
}

// Invariant 9: Fill My Day suggestions are dismissible per-day.
export async function dismissFillMyDay(today: string): Promise<void> {
  await updateSettings({ fillMyDayDismissedDate: today })
}

// First-run: 3 intro cards, then straight into the (empty) Backlog.
export async function completeFirstRun(): Promise<void> {
  await updateSettings({ firstRunComplete: true })
}

// Shared by the Settings toggle and the "first successful Feed the Goose"
// auto-prompt — never re-prompts once the browser has already denied it.
export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    await updateSettings({ notificationsEnabled: true })
    return
  }
  if (Notification.permission === 'denied') return
  const permission = await Notification.requestPermission()
  await updateSettings({ notificationsEnabled: permission === 'granted' })
}

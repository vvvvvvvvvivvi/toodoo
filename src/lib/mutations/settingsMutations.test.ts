import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useSettingsStore } from '@/stores/useSettingsStore'
import {
  completeFirstRun,
  dismissFillMyDay,
  requestNotificationPermission,
  updateSettings,
} from '@/lib/mutations/settingsMutations'

beforeEach(async () => {
  await db.settings.clear()
  await db.settings.put(DEFAULT_SETTINGS)
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
})

describe('updateSettings', () => {
  it('patches the store and persists to Dexie', async () => {
    await updateSettings({ dayEndTime: '20:00' })

    expect(useSettingsStore.getState().settings.dayEndTime).toBe('20:00')
    expect((await db.settings.get('singleton'))?.dayEndTime).toBe('20:00')
    // Untouched fields survive the patch.
    expect(useSettingsStore.getState().settings.defaultStomachMinutes).toBe(480)
  })
})

describe('dismissFillMyDay (Invariant 9)', () => {
  it('records the dismissal date', async () => {
    await dismissFillMyDay('2026-07-13')
    expect(useSettingsStore.getState().settings.fillMyDayDismissedDate).toBe('2026-07-13')
    expect((await db.settings.get('singleton'))?.fillMyDayDismissedDate).toBe('2026-07-13')
  })
})

describe('completeFirstRun', () => {
  it('flips firstRunComplete on and persists it', async () => {
    await completeFirstRun()
    expect(useSettingsStore.getState().settings.firstRunComplete).toBe(true)
    expect((await db.settings.get('singleton'))?.firstRunComplete).toBe(true)
  })
})

describe('requestNotificationPermission', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests permission and enables notifications when granted', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })

    await requestNotificationPermission()

    expect(requestPermission).toHaveBeenCalled()
    expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(true)
  })

  it('leaves notifications disabled when the user declines', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })

    await requestNotificationPermission()

    expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('never re-prompts once the browser has already denied permission', async () => {
    const requestPermission = vi.fn()
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission })

    await requestNotificationPermission()

    expect(requestPermission).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('enables notifications immediately if permission was already granted, without re-prompting', async () => {
    const requestPermission = vi.fn()
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission })

    await requestNotificationPermission()

    expect(requestPermission).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(true)
  })
})

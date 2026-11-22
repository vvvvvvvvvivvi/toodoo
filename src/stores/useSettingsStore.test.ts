import { describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { DEFAULT_SETTINGS } from '@/lib/db/db'

describe('useSettingsStore', () => {
  it('hydrates and patches settings', () => {
    useSettingsStore.getState().hydrate(DEFAULT_SETTINGS)
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)

    useSettingsStore.getState().update({ dayEndTime: '20:00' })
    expect(useSettingsStore.getState().settings.dayEndTime).toBe('20:00')
    expect(useSettingsStore.getState().settings.defaultStomachMinutes).toBe(
      DEFAULT_SETTINGS.defaultStomachMinutes,
    )
  })
})

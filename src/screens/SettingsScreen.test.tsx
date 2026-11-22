import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { SettingsScreen } from '@/screens/SettingsScreen'

beforeEach(async () => {
  await db.settings.clear()
  await db.settings.put(DEFAULT_SETTINGS)
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
})

describe('SettingsScreen', () => {
  it('updates the day-end time and persists it', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    const input = screen.getByLabelText(/day ends at/i)
    await user.clear(input)
    await user.type(input, '20:00')

    await waitFor(() => expect(useSettingsStore.getState().settings.dayEndTime).toBe('20:00'))
    expect((await db.settings.get('singleton'))?.dayEndTime).toBe('20:00')
  })

  it('updates the default stomach size in hours, storing minutes', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    const input = screen.getByLabelText(/default stomach/i)
    await user.clear(input)
    await user.type(input, '6')
    input.blur()

    await waitFor(() => expect(useSettingsStore.getState().settings.defaultStomachMinutes).toBe(360))
  })

  it('requests Notification permission and reflects the result when toggled on', async () => {
    const user = userEvent.setup()
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })

    render(<SettingsScreen />)
    await user.click(screen.getByRole('button', { name: /day-end notification/i }))

    await waitFor(() => expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(true))
    expect(requestPermission).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('turns notifications back off without re-requesting permission', async () => {
    const user = userEvent.setup()
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, notificationsEnabled: true } })

    render(<SettingsScreen />)
    await user.click(screen.getByRole('button', { name: /day-end notification/i }))

    await waitFor(() => expect(useSettingsStore.getState().settings.notificationsEnabled).toBe(false))
  })
})

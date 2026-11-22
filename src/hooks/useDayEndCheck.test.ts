import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'
import { useDayEndCheck } from '@/hooks/useDayEndCheck'
import type { Circle } from '@/types/models'

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useUIStore.setState({ pendingReflection: false, reflectionSummaries: [] })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDayEndCheck (Invariant 11)', () => {
  it('closes a stale circle on mount as a catch-up check', async () => {
    const stale: Circle = { id: 'c1', date: '2020-01-01', stomachMinutes: 60, state: 'active' }
    await db.circles.put(stale)
    useCircleStore.getState().setAll([stale])

    const { unmount } = renderHook(() => useDayEndCheck(true))

    await waitFor(() => expect(useCircleStore.getState().circles[0].state).toBe('closed'))
    expect(useUIStore.getState().pendingReflection).toBe(true)

    unmount()
  })

  it('does nothing while disabled', async () => {
    const stale: Circle = { id: 'c1', date: '2020-01-01', stomachMinutes: 60, state: 'active' }
    await db.circles.put(stale)
    useCircleStore.getState().setAll([stale])

    const { unmount, rerender } = renderHook(({ enabled }) => useDayEndCheck(enabled), {
      initialProps: { enabled: false },
    })
    rerender({ enabled: false })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(useCircleStore.getState().circles[0].state).toBe('active')

    unmount()
  })

  it('fires a local Notification when a closure actually happens and notifications are enabled', async () => {
    const stale: Circle = { id: 'c1', date: '2020-01-01', stomachMinutes: 60, state: 'active' }
    await db.circles.put(stale)
    useCircleStore.getState().setAll([stale])
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, notificationsEnabled: true } })

    const NotificationSpy = vi.fn()
    vi.stubGlobal('Notification', Object.assign(NotificationSpy, { permission: 'granted' }))

    const { unmount } = renderHook(() => useDayEndCheck(true))

    await waitFor(() => expect(NotificationSpy).toHaveBeenCalledWith('toodoo', expect.any(Object)))

    unmount()
  })

  it('does not fire a Notification when notifications are disabled in settings', async () => {
    const stale: Circle = { id: 'c1', date: '2020-01-01', stomachMinutes: 60, state: 'active' }
    await db.circles.put(stale)
    useCircleStore.getState().setAll([stale])

    const NotificationSpy = vi.fn()
    vi.stubGlobal('Notification', Object.assign(NotificationSpy, { permission: 'granted' }))

    const { unmount } = renderHook(() => useDayEndCheck(true))

    await waitFor(() => expect(useCircleStore.getState().circles[0].state).toBe('closed'))
    expect(NotificationSpy).not.toHaveBeenCalled()

    unmount()
  })
})

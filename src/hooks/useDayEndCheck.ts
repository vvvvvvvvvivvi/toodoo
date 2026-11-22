import { useEffect } from 'react'
import { closeDueCirclesAndReflect } from '@/lib/mutations/reflectionMutations'
import { useSettingsStore } from '@/stores/useSettingsStore'

const CHECK_INTERVAL_MS = 60_000

function maybeNotify(): void {
  if (typeof Notification === 'undefined') return
  if (!useSettingsStore.getState().settings.notificationsEnabled) return
  if (Notification.permission !== 'granted') return
  new Notification('toodoo', { body: 'HONK. The day is done — come see what got digested.' })
}

// Invariant 11: catches up on mount (the app may be reopened on a later day
// with circles left unclosed from before), then re-checks every minute while
// the app stays open past today's day-end time. No service worker — this is
// purely "while the tab is open" behavior, per the spec's web constraints.
//
// `enabled` gates the check until store hydration has finished (App.tsx
// passes `!booting`) — hooks can't be called conditionally, so the guard
// lives inside the effect instead of around the hook call.
export function useDayEndCheck(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return

    async function check() {
      const summaries = await closeDueCirclesAndReflect()
      // Nothing left to close on the next tick once a circle is actually
      // closed, so this naturally never re-fires for the same closure.
      if (summaries.length > 0) maybeNotify()
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled])
}

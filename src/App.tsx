import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { hydrateAll } from '@/lib/db/hydrate'
import { useDayEndCheck } from '@/hooks/useDayEndCheck'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { usePooStore } from '@/stores/usePooStore'
import { useReflectionStore } from '@/stores/useReflectionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { TodayScreen } from '@/screens/TodayScreen'
import { IntroCards } from '@/components/onboarding/IntroCards'
import { Duck } from '@/components/shared/Decor'

function App() {
  const [booting, setBooting] = useState(true)
  const firstRunComplete = useSettingsStore((s) => s.settings.firstRunComplete)

  useEffect(() => {
    hydrateAll().then(({ tasks, circles, poos, reflections, settings }) => {
      useTaskStore.getState().hydrate(tasks)
      useCircleStore.getState().hydrate(circles)
      usePooStore.getState().hydrate(poos)
      useReflectionStore.getState().hydrate(reflections)
      useSettingsStore.getState().hydrate(settings)
      setBooting(false)
    })
  }, [])

  useDayEndCheck(!booting)

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center">
        <Duck size={64} className="animate-bob" />
      </div>
    )
  }

  if (!firstRunComplete) {
    return <IntroCards />
  }

  return (
    <AppShell>
      <TodayScreen />
    </AppShell>
  )
}

export default App

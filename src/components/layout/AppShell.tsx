import type { ReactNode } from 'react'
import { IconDock } from '@/components/layout/IconDock'
import { TriageModal } from '@/components/today/TriageModal'
import { ReflectionSheet } from '@/components/reflection/ReflectionSheet'
import { Sheet } from '@/components/shared/Sheet'
import { AddTaskSheet, type TaskFormValues } from '@/components/backlog/AddTaskSheet'
import { useUIStore } from '@/stores/useUIStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { addTask } from '@/lib/mutations/taskMutations'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import { BacklogScreen } from '@/screens/BacklogScreen'
import { PooPileScreen } from '@/screens/PooPileScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { CircleHistoryScreen } from '@/screens/CircleHistoryScreen'

export function AppShell({ children }: { children: ReactNode }) {
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const circles = useCircleStore((s) => s.circles)
  const openCircle = circles.find((c) => c.state === 'planning' || c.state === 'active')

  // Captures straight to backlog, then immediately plants it in today's
  // circle when one is open — reachable from anywhere via the dock, not
  // tied to whichever screen/modal happens to be showing.
  async function handleAddTask(input: TaskFormValues) {
    const created = await addTask(input)
    if (openCircle && created.state === 'backlog') {
      await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: openCircle.id, taskId: created.id })
    }
  }

  return (
    // The transform establishes a CSS containing block, so descendants using
    // `fixed` positioning (icon dock, sheets) stay scoped to this 480px
    // column instead of the full viewport when centered on a wide desktop.
    <div className="mx-auto flex h-full max-w-[480px] transform-gpu flex-col bg-background">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <IconDock />

      <AddTaskSheet open={activeModal === 'addTask'} onClose={closeModal} mode="add" onSubmit={handleAddTask} />

      {/* Backlog / History / Poo Pile / Settings are the only other
          "screens" — modal overlays reachable from the icon dock, not tabs. */}
      <Sheet open={activeModal === 'backlog'} onClose={closeModal} title="Backlog">
        <BacklogScreen />
      </Sheet>
      <Sheet open={activeModal === 'history'} onClose={closeModal} title="History">
        <CircleHistoryScreen />
      </Sheet>
      <Sheet open={activeModal === 'pooPile'} onClose={closeModal} title="Poo Pile">
        <PooPileScreen />
      </Sheet>
      <Sheet open={activeModal === 'settings'} onClose={closeModal} title="Settings">
        <SettingsScreen />
      </Sheet>

      <TriageModal />
      <ReflectionSheet />
    </div>
  )
}

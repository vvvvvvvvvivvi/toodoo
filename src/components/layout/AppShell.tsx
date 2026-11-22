import type { ReactNode } from 'react'
import { IconDock } from '@/components/layout/IconDock'
import { TriageModal } from '@/components/today/TriageModal'
import { ReflectionSheet } from '@/components/reflection/ReflectionSheet'
import { Sheet } from '@/components/shared/Sheet'
import { Toast } from '@/components/shared/Toast'
import { Carrots, GooseFace } from '@/components/shared/Decor'
import { AddTaskSheet, type TaskFormValues } from '@/components/backlog/AddTaskSheet'
import { useUIStore } from '@/stores/useUIStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useTaskStore } from '@/stores/useTaskStore'
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
    const { showToast } = useUIStore.getState()
    if (openCircle && created.state === 'backlog') {
      await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: openCircle.id, taskId: created.id })
      const planted = useTaskStore.getState().tasks.find((t) => t.id === created.id)
      // A blocked add opens Triage instead; no celebration until it fits.
      if (planted?.state === 'planned') showToast(`nom! "${created.title}" is on the menu`)
    } else {
      showToast(`"${created.title}" is tucked in the pantry`)
    }
  }

  return (
    // Full-width shell: the scroll container spans the whole window (so the
    // scrollbar sits at the edge on desktop) while the content itself is a
    // centered column — narrow on phones, a two-page planner spread on wide
    // screens. Fixed layers (dock, sheets, toast) cover the real viewport.
    <div className="relative flex h-full flex-col">
      {/* Corner doodles, behind everything. */}
      <GooseFace size={120} className="fixed -bottom-8 -left-8 z-0 rotate-12 opacity-90 md:size-[170px]" />
      <Carrots className="fixed -right-3 bottom-16 z-0 md:right-6 md:scale-125" />

      <main className="relative z-10 flex-1 overflow-y-auto pb-28">
        <div className="mx-auto h-full w-full max-w-[480px] md:max-w-[620px] lg:max-w-[1080px]">{children}</div>
      </main>
      <IconDock />
      <Toast />

      <AddTaskSheet
        open={activeModal === 'addTask'}
        onClose={closeModal}
        mode="add"
        submitLabel={openCircle ? 'Feed it to the goose 🪿' : 'Tuck into the pantry 🥫'}
        onSubmit={handleAddTask}
      />

      {/* Pantry / History / Poo Pile / Settings are the only other
          "screens" — modal overlays reachable from the dock, not tabs. */}
      <Sheet open={activeModal === 'backlog'} onClose={closeModal} title="The pantry">
        <BacklogScreen />
      </Sheet>
      <Sheet open={activeModal === 'history'} onClose={closeModal} title="Past days">
        <CircleHistoryScreen />
      </Sheet>
      <Sheet open={activeModal === 'pooPile'} onClose={closeModal} title="Poo pile">
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

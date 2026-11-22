import { History, ListTodo, Plus, Settings, Trophy } from 'lucide-react'
import { useUIStore, type Modal } from '@/stores/useUIStore'

// Add Task is the primary CTA (filled/primary color); the rest are neutral
// navigation into their respective modal.
const ICONS: { modal: Modal; label: string; icon: typeof ListTodo; primary?: boolean }[] = [
  { modal: 'addTask', label: 'Add task', icon: Plus, primary: true },
  { modal: 'backlog', label: 'Backlog', icon: ListTodo },
  { modal: 'history', label: 'History', icon: History },
  { modal: 'pooPile', label: 'Poo Pile', icon: Trophy },
  { modal: 'settings', label: 'Settings', icon: Settings },
]

// Docked top-right, always reachable — the only "navigation" left now that
// Today is the sole page. Icon-only by design (visual-first over wordy).
export function IconDock() {
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div className="fixed right-3 top-3 z-30 flex gap-1.5">
      {ICONS.map(({ modal, label, icon: Icon, primary }) => (
        <button
          key={modal}
          type="button"
          onClick={() => openModal(modal)}
          aria-label={label}
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${
            primary ? 'bg-primary text-background' : 'bg-circle-empty/80 text-text-primary'
          }`}
        >
          <Icon size={20} />
        </button>
      ))}
    </div>
  )
}

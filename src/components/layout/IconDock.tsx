import { Archive, BookOpen, Award, Settings, type LucideIcon } from 'lucide-react'
import { useUIStore, type Modal } from '@/stores/useUIStore'

type DockItem = { modal: Modal; label: string; icon: LucideIcon }

const LEFT: DockItem[] = [
  { modal: 'backlog', label: 'Pantry', icon: Archive },
  { modal: 'history', label: 'History', icon: BookOpen },
]
const RIGHT: DockItem[] = [
  { modal: 'pooPile', label: 'Poo Pile', icon: Award },
  { modal: 'settings', label: 'Settings', icon: Settings },
]

function DockButton({ item }: { item: DockItem }) {
  const openModal = useUIStore((s) => s.openModal)
  return (
    <button
      type="button"
      onClick={() => openModal(item.modal)}
      aria-label={item.label}
      className="group flex w-14 flex-col items-center gap-0.5 rounded-2xl py-1"
    >
      <item.icon
        size={21}
        strokeWidth={2.2}
        className="text-text-primary transition-transform group-hover:-translate-y-0.5 group-active:scale-90"
      />
      <span className="font-hand text-sm font-bold lowercase leading-none text-text-secondary">{item.label}</span>
    </button>
  )
}

// Floating bottom dock. Add Task sits in the middle as a big round "feed me"
// button — the main thing you do here.
export function IconDock() {
  const openModal = useUIStore((s) => s.openModal)

  return (
    <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-paper/95 px-3 py-1.5 shadow-[0_6px_24px_rgb(59_42_30/0.14)] ring-2 ring-text-primary/10">
        {LEFT.map((item) => (
          <DockButton key={item.modal} item={item} />
        ))}
        <button
          type="button"
          onClick={() => openModal('addTask')}
          aria-label="Add task"
          className="-mt-8 mx-1 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-4xl text-text-primary border-[2.5px] border-text-primary shadow-[0_3px_0_var(--color-text-primary)] ring-4 ring-background transition-transform hover:rotate-6 active:translate-y-1 active:shadow-[0_1px_0_var(--color-text-primary)]"
        >
          +
        </button>
        {RIGHT.map((item) => (
          <DockButton key={item.modal} item={item} />
        ))}
      </div>
    </nav>
  )
}

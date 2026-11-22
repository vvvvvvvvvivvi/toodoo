import type { ReactNode } from 'react'
import { Sparkle, Washi } from '@/components/shared/Decor'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// Mobile-first bottom sheet styled like a page torn from a planner: washi
// tape on top, a hand-lettered title, and a soft bouncy slide-up.
export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-text-primary/30 backdrop-blur-[2px] md:items-center md:p-6"
      onClick={onClose}
    >
      {/* Phone: bottom sheet. Wider screens: a centered planner card. */}
      <div
        role="dialog"
        aria-label={title}
        className="relative mx-auto flex max-h-[88vh] w-full max-w-[480px] animate-sheet-up flex-col rounded-t-[40px] bg-background px-5 pb-6 pt-7 shadow-[0_-6px_30px_rgb(59_42_30/0.12)] md:max-h-[85vh] md:max-w-[560px] md:rounded-[40px] md:px-7 md:shadow-[0_12px_40px_rgb(59_42_30/0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Washi className="absolute -top-2 left-1/2 -translate-x-1/2" rotate={-3} />

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="hand-label flex items-center gap-1.5 text-2xl leading-tight">
            {title}
            <Sparkle size={16} />
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-butter font-display text-text-secondary transition-transform hover:rotate-90"
          >
            ✕
          </button>
        </div>
        <div className="-mx-1 overflow-y-auto px-1 pb-1">{children}</div>
      </div>
    </div>
  )
}

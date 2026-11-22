import { useEffect } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { DuckFace } from '@/components/shared/Decor'

const TOAST_MS = 2200

export function Toast() {
  const toast = useUIStore((s) => s.toast)
  const clearToast = useUIStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clearToast, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <div
        key={toast}
        role="status"
        className="flex max-w-full animate-pop-in items-center gap-2 rounded-[24px] bg-paper py-1.5 pl-1.5 pr-4 shadow-[0_6px_20px_rgb(59_42_30/0.15)] ring-2 ring-butter-deep"
      >
        <DuckFace size={30} className="shrink-0 animate-wiggle" />
        <span className="font-hand text-lg font-bold leading-tight text-text-primary">{toast}</span>
      </div>
    </div>
  )
}

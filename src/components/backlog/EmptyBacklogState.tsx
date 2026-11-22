import { LoungingDuck } from '@/components/shared/Decor'

export function EmptyBacklogState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <LoungingDuck size={160} />
      <h1 className="hand-label text-2xl">Chuck your tasks in here. The pie comes later.</h1>
    </div>
  )
}

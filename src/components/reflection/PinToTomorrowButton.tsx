import { useState } from 'react'
import { pinToTomorrow } from '@/lib/mutations/reflectionMutations'

interface PinToTomorrowButtonProps {
  taskId: string
  title: string
}

export function PinToTomorrowButton({ taskId, title }: PinToTomorrowButtonProps) {
  const [pinned, setPinned] = useState(false)

  async function handleClick() {
    await pinToTomorrow(taskId)
    setPinned(true)
  }

  return (
    <div className="flex items-center gap-2 rounded-[20px] bg-paper px-4 py-2.5 ring-2 ring-butter">
      <span className="flex-1 font-body text-sm text-text-primary">{title}</span>
      <button
        type="button"
        onClick={handleClick}
        disabled={pinned}
        className={`rounded-lg px-3 py-1 font-body text-sm ${
          pinned ? 'bg-accent/30 text-text-secondary' : 'bg-primary text-text-primary'
        }`}
      >
        {pinned ? 'Pinned ✓' : 'Pin to tomorrow'}
      </button>
    </div>
  )
}

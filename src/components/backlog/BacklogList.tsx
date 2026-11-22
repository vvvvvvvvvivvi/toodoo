import { BacklogTaskRow } from '@/components/backlog/BacklogTaskRow'
import type { Task } from '@/types/models'

interface BacklogListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onAddToToday?: (taskId: string) => void
}

// Newest-first — a quick-capture inbox reads naturally with the latest
// addition on top. Not governed by any invariant, a free UX choice.
export function BacklogList({ tasks, onEdit, onDelete, onAddToToday }: BacklogListProps) {
  const sorted = [...tasks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="flex flex-col gap-2 p-4">
      {sorted.map((task) => (
        <BacklogTaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onAddToToday={onAddToToday} />
      ))}
    </div>
  )
}

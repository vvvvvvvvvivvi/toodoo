import { useState } from 'react'
import { TaskRow } from '@/components/today/TaskRow'
import { NibbleModal } from '@/components/today/NibbleModal'
import { AddTaskSheet, type TaskFormValues } from '@/components/backlog/AddTaskSheet'
import { editPlannedTask, reorderPlannedTasks, nibbleTask } from '@/lib/mutations/taskMutations'
import type { Task } from '@/types/models'

interface TaskListTodayProps {
  circleId: string
  tasks: Task[] // planned tasks for this circle, already sorted by sortIndex
  today: string
}

export function TaskListToday({ circleId, tasks, today }: TaskListTodayProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [nibbleTarget, setNibbleTarget] = useState<Task | null>(null)
  const [editTarget, setEditTarget] = useState<Task | null>(null)

  async function handleDrop(targetId: string) {
    const dragged = draggingId
    setDraggingId(null)
    if (!dragged || dragged === targetId) return

    const ids = tasks.map((t) => t.id)
    const fromIndex = ids.indexOf(dragged)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return

    ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, dragged)
    await reorderPlannedTasks(circleId, ids)
  }

  async function handleEditSubmit(input: TaskFormValues) {
    if (!editTarget) return
    await editPlannedTask(circleId, editTarget.id, input)
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          today={today}
          onNibble={setNibbleTarget}
          onEdit={setEditTarget}
          onDragStart={() => setDraggingId(task.id)}
          onDragOver={() => {}}
          onDrop={() => handleDrop(task.id)}
        />
      ))}
      <NibbleModal task={nibbleTarget} onClose={() => setNibbleTarget(null)} onSubmit={nibbleTask} />
      <AddTaskSheet
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        mode="edit"
        initialTask={editTarget ?? undefined}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}

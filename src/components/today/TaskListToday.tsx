import { useState } from 'react'
import { TaskRow } from '@/components/today/TaskRow'
import { NibbleModal } from '@/components/today/NibbleModal'
import { AddTaskSheet, type TaskFormValues } from '@/components/backlog/AddTaskSheet'
import { editPlannedTask, reorderPlannedTasks, nibbleTask } from '@/lib/mutations/taskMutations'
import { useUIStore } from '@/stores/useUIStore'
import { LoungingDuck } from '@/components/shared/Decor'
import type { Task } from '@/types/models'

interface TaskListTodayProps {
  circleId: string
  tasks: Task[] // planned tasks for this circle, already sorted by sortIndex
  today: string
}

export function TaskListToday({ circleId, tasks, today }: TaskListTodayProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
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
    <div className="flex flex-col gap-2">
      {tasks.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-3">
          <LoungingDuck size={130} />
          <p className="text-center font-hand text-lg font-bold text-text-secondary">
            the plate is empty… the goose is peckish
          </p>
        </div>
      )}
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          today={today}
          open={openId === task.id}
          onToggle={() => setOpenId(openId === task.id ? null : task.id)}
          onNibble={setNibbleTarget}
          onEdit={setEditTarget}
          onDragStart={() => setDraggingId(task.id)}
          onDragOver={() => {}}
          onDrop={() => handleDrop(task.id)}
        />
      ))}

      {/* Write-in line at the bottom of the list, like a blank planner row. */}
      <button
        type="button"
        onClick={() => useUIStore.getState().openModal('addTask')}
        className="group flex items-center gap-3 rounded-[20px] border-2 border-dashed border-butter-deep px-3 py-2.5 text-left transition-colors hover:bg-paper/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-display text-lg leading-none transition-transform group-hover:rotate-90">
          +
        </span>
        <span className="font-hand text-lg font-bold text-text-secondary">jot down something yummy…</span>
      </button>

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

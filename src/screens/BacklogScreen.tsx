import { useState } from 'react'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { deleteTask, editBacklogTask } from '@/lib/mutations/taskMutations'
import { attemptCapacityMutation } from '@/lib/mutations/circleMutations'
import { AddTaskSheet, type TaskFormValues } from '@/components/backlog/AddTaskSheet'
import { BacklogList } from '@/components/backlog/BacklogList'
import { EmptyBacklogState } from '@/components/backlog/EmptyBacklogState'
import type { Task } from '@/types/models'

export function BacklogScreen() {
  const tasks = useTaskStore((s) => s.tasks)
  const circles = useCircleStore((s) => s.circles)
  const backlogTasks = tasks.filter((t) => t.state === 'backlog')
  const openCircle = circles.find((c) => c.state === 'planning' || c.state === 'active')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  async function handleSubmit(input: TaskFormValues) {
    if (editingTask) {
      await editBacklogTask(editingTask.id, input)
    }
  }

  async function handleDelete(taskId: string) {
    await deleteTask(taskId)
  }

  async function handleAddToToday(taskId: string) {
    if (!openCircle) return
    // Blocked (over-capacity) additions open the Triage modal via
    // attemptCapacityMutation itself — nothing extra to handle here.
    await attemptCapacityMutation({ kind: 'addTaskToCircle', circleId: openCircle.id, taskId })
  }

  return (
    <div>
      {backlogTasks.length === 0 ? (
        <EmptyBacklogState />
      ) : (
        <BacklogList
          tasks={backlogTasks}
          onEdit={setEditingTask}
          onDelete={handleDelete}
          onAddToToday={openCircle ? handleAddToToday : undefined}
        />
      )}

      <AddTaskSheet
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        mode="edit"
        initialTask={editingTask ?? undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { useCircleStore } from '@/stores/useCircleStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUIStore } from '@/stores/useUIStore'
import { getTriageOptions, type TriageOptionGroup, type TriageTarget } from '@/lib/invariants/triage'
import { MIN_ESTIMATE_MINUTES } from '@/lib/invariants/sizeThresholds'
import { localToday, addDays } from '@/lib/utils/date'
import { Sheet } from '@/components/shared/Sheet'
import {
  resolveDelete,
  resolveGrowStomach,
  resolveMoveDeadline,
  resolveReturnToBacklog,
  resolveShrink,
  resolveSplit,
} from '@/lib/mutations/triageMutations'
import type { Task } from '@/types/models'

export function TriageModal() {
  const triage = useUIStore((s) => s.triage)
  const closeTriage = useUIStore((s) => s.closeTriage)
  const circles = useCircleStore((s) => s.circles)
  const tasks = useTaskStore((s) => s.tasks)

  if (!triage) return null
  const circle = circles.find((c) => c.id === triage.circleId)
  if (!circle) return null

  const today = localToday()
  const groups = getTriageOptions(circle, tasks, triage.overflowMinutes, today)
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  return (
    <Sheet open title="That's more than the goose can stomach" onClose={closeTriage}>
      <div className="flex flex-col gap-5">
        <p className="font-body text-sm text-warning">{triage.overflowMinutes}m over the stomach's limit.</p>
        {groups.map((group) => (
          <TriageGroup
            key={group.kind}
            group={group}
            circleId={circle.id}
            overflowMinutes={triage.overflowMinutes}
            taskById={taskById}
          />
        ))}
      </div>
    </Sheet>
  )
}

function TriageGroup({
  group,
  circleId,
  overflowMinutes,
  taskById,
}: {
  group: TriageOptionGroup
  circleId: string
  overflowMinutes: number
  taskById: Map<string, Task>
}) {
  if (group.kind !== 'growStomach' && group.targets.length === 0) return null

  switch (group.kind) {
    case 'split':
      return (
        <TriageSection title="Split a task">
          {group.targets.map((t) => {
            const task = taskById.get(t.taskId)
            const suggested = t.suggestedSplitMinutes ?? 0
            if (!task) return null
            const keep = task.remainingMinutes - suggested
            return (
              <button
                key={t.taskId}
                type="button"
                onClick={() => resolveSplit(circleId, t.taskId, suggested)}
                className="rounded-2xl bg-circle-empty px-4 py-2 text-left font-body text-sm text-text-primary"
              >
                Split "{task.title}" — keep {keep}m now, {suggested}m back to the pantry
              </button>
            )
          })}
        </TriageSection>
      )
    case 'returnToBacklog':
      return (
        <TriageSection title="Send back to the pantry">
          {group.targets.map((t) => {
            const task = taskById.get(t.taskId)
            if (!task) return null
            return (
              <button
                key={t.taskId}
                type="button"
                onClick={() => resolveReturnToBacklog(circleId, t.taskId)}
                className="rounded-2xl bg-circle-empty px-4 py-2 text-left font-body text-sm text-text-primary"
              >
                {task.title} ({task.remainingMinutes}m)
              </button>
            )
          })}
        </TriageSection>
      )
    case 'shrinkEstimate':
      return (
        <TriageSection title="Shrink an estimate">
          {group.targets.map((t) => (
            <ShrinkRow key={t.taskId} circleId={circleId} target={t} overflowMinutes={overflowMinutes} task={taskById.get(t.taskId)} />
          ))}
        </TriageSection>
      )
    case 'delete':
      return (
        <TriageSection title="Delete">
          {group.targets.map((t) => {
            const task = taskById.get(t.taskId)
            if (!task) return null
            return (
              <button
                key={t.taskId}
                type="button"
                onClick={() => resolveDelete(circleId, t.taskId)}
                className="rounded-2xl bg-warning/10 px-4 py-2 text-left font-body text-sm text-warning"
              >
                Delete "{task.title}"
              </button>
            )
          })}
        </TriageSection>
      )
    case 'moveDeadline':
      return (
        <TriageSection title="Move a deadline">
          {group.targets.map((t) => (
            <MoveDeadlineRow key={t.taskId} circleId={circleId} taskId={t.taskId} task={taskById.get(t.taskId)} />
          ))}
        </TriageSection>
      )
    case 'growStomach':
      return (
        <button
          type="button"
          onClick={() => resolveGrowStomach(circleId, group.suggestedStomachMinutes!)}
          className="rounded-2xl bg-primary px-4 py-3 font-display text-base text-background"
        >
          Grow the stomach to {group.suggestedStomachMinutes}m
        </button>
      )
    default:
      return null
  }
}

function TriageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm text-text-primary">{title}</h3>
      {children}
    </div>
  )
}

function ShrinkRow({
  circleId,
  target,
  overflowMinutes,
  task,
}: {
  circleId: string
  target: TriageTarget
  overflowMinutes: number
  task?: Task
}) {
  const maxShrink = target.maxShrinkMinutes ?? 0
  const defaultNewEstimate = task
    ? Math.max(MIN_ESTIMATE_MINUTES, task.remainingMinutes - Math.min(overflowMinutes, maxShrink))
    : MIN_ESTIMATE_MINUTES
  const [value, setValue] = useState(String(defaultNewEstimate))

  if (!task) return null

  async function handleShrink() {
    const minutes = Number(value)
    if (!Number.isFinite(minutes) || minutes < MIN_ESTIMATE_MINUTES) return
    await resolveShrink(circleId, task!.id, minutes)
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-circle-empty px-4 py-2">
      <span className="flex-1 font-body text-sm text-text-primary">{task.title}</span>
      <input
        type="number"
        min={MIN_ESTIMATE_MINUTES}
        max={task.remainingMinutes - 1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded-lg border border-primary/40 bg-background px-2 py-1 text-center font-body text-sm"
      />
      <button type="button" onClick={handleShrink} className="rounded-lg bg-primary px-3 py-1 font-body text-sm text-background">
        Shrink
      </button>
    </div>
  )
}

function MoveDeadlineRow({ circleId, taskId, task }: { circleId: string; taskId: string; task?: Task }) {
  const tomorrow = addDays(localToday(), 1)
  const [value, setValue] = useState(tomorrow)

  if (!task) return null

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-circle-empty px-4 py-2">
      <span className="flex-1 font-body text-sm text-text-primary">{task.title}</span>
      <input
        type="date"
        min={tomorrow}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-lg border border-primary/40 bg-background px-2 py-1 font-body text-sm"
      />
      <button
        type="button"
        onClick={() => resolveMoveDeadline(circleId, taskId, value)}
        className="rounded-lg bg-primary px-3 py-1 font-body text-sm text-background"
      >
        Move
      </button>
    </div>
  )
}

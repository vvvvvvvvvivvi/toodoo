import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { localToday } from '@/lib/utils/date'
import { computePlannedMinutes, validateCircleCapacity } from '@/lib/invariants/capacity'
import { DonutChart } from '@/components/today/DonutChart'
import { TaskListToday } from '@/components/today/TaskListToday'
import { EmptyTodayState } from '@/components/today/EmptyTodayState'
import { StomachResizer } from '@/components/today/StomachResizer'
import { FillMyDayTray } from '@/components/today/FillMyDayTray'

export function TodayScreen() {
  const tasks = useTaskStore((s) => s.tasks)
  const circles = useCircleStore((s) => s.circles)
  const settings = useSettingsStore((s) => s.settings)
  const today = localToday()

  const openCircle = circles.find((c) => c.state === 'planning' || c.state === 'active')

  if (!openCircle) {
    // Invariant 10: sequential same-day circles are allowed. If today already
    // had one (finished, abandoned, or closed), greet with "another helping"
    // instead of the first-run "how many hours have we got".
    const hadEarlierCircleToday = circles.some((c) => c.date === today)
    return <EmptyTodayState today={today} anotherHelping={hadEarlierCircleToday} />
  }

  const circleTasks = tasks.filter((t) => t.circleId === openCircle.id)
  const plannedTasks = circleTasks.filter((t) => t.state === 'planned').sort((a, b) => a.sortIndex - b.sortIndex)
  const capacity = validateCircleCapacity(openCircle, circleTasks)
  const gapMinutes = openCircle.stomachMinutes - computePlannedMinutes(openCircle.id, tasks)
  const backlogTasks = tasks.filter((t) => t.state === 'backlog')
  const showFillMyDay = gapMinutes > 0 && settings.fillMyDayDismissedDate !== today

  return (
    <div className="flex h-full flex-col">
      {/* No "Today" label needed — this is the only page. Icon dock (top
          right) already reads as navigation; just leave room for it. */}
      <header className="px-4 pr-40 pt-4">
        <StomachResizer circleId={openCircle.id} stomachMinutes={openCircle.stomachMinutes} />
      </header>

      {/* Donut is the centerpiece: centered as a group with the tasks below
          it in the space under the header, rather than pinned to the top
          with dead space beneath on a light day. Falls back to natural
          top-aligned scrolling once the list is long enough to fill the
          space (justify-center degrades gracefully on overflow). */}
      <div className="flex flex-1 flex-col justify-center overflow-y-auto">
        <DonutChart circle={openCircle} tasks={circleTasks} today={today} />

        {showFillMyDay && (
          <FillMyDayTray circleId={openCircle.id} backlogTasks={backlogTasks} gapMinutes={gapMinutes} today={today} />
        )}

        {!capacity.ok && (
          <button
            type="button"
            onClick={() =>
              useUIStore.getState().openTriage({ circleId: openCircle.id, overflowMinutes: capacity.overflowMinutes })
            }
            className="mx-4 mb-2 rounded-2xl bg-warning/10 px-4 py-3 text-left font-body text-sm text-warning"
          >
            That's more than the goose can stomach — {capacity.overflowMinutes}m over. Tap to sort it out.
          </button>
        )}

        <TaskListToday circleId={openCircle.id} tasks={plannedTasks} today={today} />
      </div>
    </div>
  )
}

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
import { Duck, Sparkle } from '@/components/shared/Decor'

function prettyDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    .toLowerCase()
}

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
  const digestedCount = circleTasks.filter((t) => t.state === 'completed').length
  const capacity = validateCircleCapacity(openCircle, circleTasks)
  const plannedMinutes = computePlannedMinutes(openCircle.id, tasks)
  const gapMinutes = openCircle.stomachMinutes - plannedMinutes
  const backlogTasks = tasks.filter((t) => t.state === 'backlog')
  const showFillMyDay = gapMinutes > 0 && settings.fillMyDayDismissedDate !== today

  return (
    // Phone: one column. Wider screens: a two-page planner spread — duck2
    // and its tummy on the left page, a tall to-do list on the right.
    <div className="flex flex-col gap-5 px-4 pb-6 pt-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:min-h-full lg:items-stretch lg:gap-8 lg:px-8 lg:pt-8">
      <div className="flex flex-col gap-5">
        {/* Planner header: hand-lettered title on a soft blob, duck2 perched beside it. */}
        <header className="relative flex items-center justify-center pt-2">
          <div className="blob absolute left-1/2 top-0 h-[120px] w-[250px] -translate-x-1/2 bg-butter/80" />
          <Sparkle size={18} className="absolute left-6 top-4" delay={0.4} />
          <Sparkle size={22} className="absolute right-3 top-0" delay={0.2} />
          <div className="relative text-center">
            <h1 className="hand-label text-[40px] leading-[0.95] lg:text-[48px]">
              today's
              <br />
              menu
            </h1>
            <p className="mt-1 font-hand text-lg font-bold text-text-secondary">{prettyDate(today)}</p>
          </div>
          <Duck size={58} className="absolute right-4 top-3 animate-bob" />
        </header>

        {/* "NAME:" pill from a paper planner → the stomach size. */}
        <div className="flex items-center gap-3 rounded-full border-2 border-text-primary/80 bg-butter px-5 py-2">
          <span className="hand-label text-lg">tummy:</span>
          <StomachResizer circleId={openCircle.id} stomachMinutes={openCircle.stomachMinutes} />
          <span className="ml-auto font-hand text-lg font-bold text-text-primary/70">
            {gapMinutes >= 0 ? `${gapMinutes}m free` : 'too full!'}
          </span>
      </div>

        {!capacity.ok && (
          <button
            type="button"
            onClick={() =>
              useUIStore.getState().openTriage({ circleId: openCircle.id, overflowMinutes: capacity.overflowMinutes })
            }
            className="relative -rotate-1 animate-wiggle rounded-[20px] border-2 border-dashed border-warning/50 bg-paper px-4 py-3 text-left font-hand text-lg font-bold leading-snug text-warning"
          >
            That's more than duck2 can stomach — {capacity.overflowMinutes}m over. Tap to sort it out.
          </button>
        )}

        {/* Tummy meter */}
        <section className="card relative flex flex-col pb-3 lg:flex-1">
          <h2 className="hand-label text-lg">tummy meter:</h2>
          <div className="flex flex-1 items-center py-2">
            <DonutChart circle={openCircle} tasks={circleTasks} today={today} />
          </div>
          <div className="flex justify-center gap-4 font-hand text-base font-bold text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-accent" /> eaten
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-butter-deep ring-1 ring-text-primary/30" /> on the plate
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-paper ring-1 ring-butter-deep" /> room left
            </span>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        {/* To-do list */}
        <section className="card ruled relative lg:flex-1 lg:px-6 lg:py-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="hand-label text-xl lg:text-2xl">to do list:</h2>
            {digestedCount > 0 && (
              <span className="font-hand text-base font-bold text-accent">{digestedCount} gobbled ✓</span>
            )}
          </div>
          <TaskListToday circleId={openCircle.id} tasks={plannedTasks} today={today} />
        </section>

        {showFillMyDay && (
          <FillMyDayTray circleId={openCircle.id} backlogTasks={backlogTasks} gapMinutes={gapMinutes} today={today} />
        )}
      </div>
    </div>
  )
}

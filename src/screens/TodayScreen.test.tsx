import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { usePooStore } from '@/stores/usePooStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'
import { localToday } from '@/lib/utils/date'
import { TodayScreen } from '@/screens/TodayScreen'
import type { Task } from '@/types/models'

const today = localToday()

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 30,
    state: 'planned',
    sortIndex: 0,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

async function seedPlannedTask(circleId: string, overrides: Partial<Task>) {
  const t = task({ circleId, ...overrides })
  await db.tasks.put(t)
  useTaskStore.getState().setAll([...useTaskStore.getState().tasks, t])
  return t
}

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  await db.poos.clear()
  await db.settings.clear()
  await db.settings.put(DEFAULT_SETTINGS)
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  usePooStore.setState({ poos: [] })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useUIStore.setState({ activeModal: null })
})

describe('TodayScreen empty state -> circle creation', () => {
  it('shows the goose prompt with no circle, and creates one via a preset', async () => {
    const user = userEvent.setup()
    render(<TodayScreen />)

    expect(screen.getByText(/How many hours have we got/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '8h' }))
    await user.click(screen.getByRole('button', { name: /let's go/i }))

    await waitFor(() => expect(useCircleStore.getState().circles).toHaveLength(1))
    expect(useCircleStore.getState().circles[0].stomachMinutes).toBe(480)
    expect(screen.getByText('480m stomach')).toBeInTheDocument()
  })
})

describe('TodayScreen with an open circle', () => {
  it('shows planned tasks and completes one via the check button', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Ship it', remainingMinutes: 30 })

    render(<TodayScreen />)
    expect(screen.getByText('Ship it')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /complete ship it/i }))

    await waitFor(() => expect(screen.queryByText('Ship it')).not.toBeInTheDocument())
    expect(usePooStore.getState().poos).toHaveLength(1)
    expect(useTaskStore.getState().tasks[0].state).toBe('completed')
  })

  it('nibbles a task, reducing its remaining minutes without completing it', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Chip away', remainingMinutes: 30 })

    render(<TodayScreen />)
    await user.click(screen.getByText('Chip away'))
    await user.click(screen.getByRole('button', { name: /nibble chip away/i }))
    await screen.findByText('Nibble at "Chip away"')

    const input = screen.getByLabelText(/minutes worked/i)
    await user.clear(input)
    await user.type(input, '10')
    await user.click(screen.getByRole('button', { name: /^nibble$/i }))

    await waitFor(() => expect(screen.getByText('20m left')).toBeInTheDocument())
    expect(usePooStore.getState().poos).toEqual([])
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
  })

  it('returns an unlocked task to backlog, removing it from the Today list', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Not today', remainingMinutes: 30 })

    render(<TodayScreen />)
    await user.click(screen.getByText('Not today'))
    await user.click(screen.getByRole('button', { name: /return not today to backlog/i }))

    await waitFor(() => expect(screen.queryByText('Not today')).not.toBeInTheDocument())
    expect(useTaskStore.getState().tasks[0].state).toBe('backlog')
  })

  it('shakes and refuses to return a locked task to backlog', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Due today', remainingMinutes: 30, deadline: today })

    render(<TodayScreen />)
    await user.click(screen.getByText('Due today'))
    await user.click(screen.getByRole('button', { name: /return due today to backlog/i }))

    // Still there and still planned — the click was refused, not applied.
    expect(screen.getByText('Due today')).toBeInTheDocument()
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
  })

  it('renders a lock glyph next to a locked task title', async () => {
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Locked task', remainingMinutes: 30, deadline: today })

    render(<TodayScreen />)
    expect(screen.getByText('Locked task').querySelector('svg')).toBeInTheDocument()
  })
})

describe('Fill My Day tray (Invariant 9)', () => {
  async function seedBacklogTask(overrides: Partial<Task>) {
    const t = task({ state: 'backlog', circleId: undefined, ...overrides })
    await db.tasks.put(t)
    useTaskStore.getState().setAll([...useTaskStore.getState().tasks, t])
    return t
  }

  it('shows suggestions when underfilled and adds one on tap', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 100, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 'planned', remainingMinutes: 30 }) // 70m gap
    await seedBacklogTask({ id: 'suggestion', title: 'Quick win', remainingMinutes: 20 })

    render(<TodayScreen />)

    expect(screen.getByText(/the goose is still hungry — 70m to go/i)).toBeInTheDocument()
    expect(screen.getByText(/Quick win/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Quick win/ }))

    await waitFor(() => {
      const t = useTaskStore.getState().tasks.find((x) => x.id === 'suggestion')
      expect(t?.state).toBe('planned')
      expect(t?.circleId).toBe('c1')
    })
  })

  it('dismisses for the day and stays hidden after dismissal', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 100, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 'planned', remainingMinutes: 30 })
    await seedBacklogTask({ id: 'suggestion', title: 'Quick win', remainingMinutes: 20 })

    render(<TodayScreen />)
    expect(screen.getByText(/the goose is still hungry/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dismiss fill my day suggestions/i }))

    await waitFor(() => expect(screen.queryByText(/the goose is still hungry/i)).not.toBeInTheDocument())
    expect(useSettingsStore.getState().settings.fillMyDayDismissedDate).toBe(today)
  })

  it('never appears once the circle is full', async () => {
    const circle = { id: 'c1', date: today, stomachMinutes: 30, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 'planned', remainingMinutes: 30 })
    await seedBacklogTask({ id: 'suggestion', title: 'Quick win', remainingMinutes: 20 })

    render(<TodayScreen />)
    expect(screen.queryByText(/the goose is still hungry/i)).not.toBeInTheDocument()
  })
})

describe('"Another helping?" prompt (Invariant 10)', () => {
  it('shows the first-run prompt when no circle has existed today at all', () => {
    render(<TodayScreen />)
    expect(screen.getByText('How many hours have we got?')).toBeInTheDocument()
  })

  it('shows "Another helping?" once a circle from today already finished', async () => {
    const finished = { id: 'c1', date: today, stomachMinutes: 60, state: 'cleanPlate' as const }
    await db.circles.put(finished)
    useCircleStore.getState().setAll([finished])

    render(<TodayScreen />)
    expect(screen.getByText('Another helping?')).toBeInTheDocument()
  })
})

describe('Edit/delete a task from Today', () => {
  it('edits a task\'s title, estimate, and tags via the edit sheet', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Draft', estimateMinutes: 30, remainingMinutes: 30 })

    render(<TodayScreen />)
    await user.click(screen.getByText('Draft'))
    await user.click(screen.getByRole('button', { name: /edit draft/i }))

    const titleInput = await screen.findByDisplayValue('Draft')
    await user.clear(titleInput)
    await user.type(titleInput, 'Final draft')
    await user.click(screen.getByRole('button', { name: /tags/i }))
    await user.type(screen.getByPlaceholderText(/work, urgent/i), 'writing')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByText('Final draft')).toBeInTheDocument())
    const updated = useTaskStore.getState().tasks[0]
    expect(updated.tags).toEqual(['writing'])
    expect(screen.getByText('writing')).toBeInTheDocument()
  })

  it('deletes an unlocked task directly from Today', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Throwaway' })

    render(<TodayScreen />)
    await user.click(screen.getByText('Throwaway'))
    await user.click(screen.getByRole('button', { name: /delete throwaway/i }))

    await waitFor(() => expect(useTaskStore.getState().tasks).toHaveLength(0))
  })

  it('shakes and refuses to delete a locked task', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])
    await seedPlannedTask('c1', { id: 't1', title: 'Locked', deadline: today })

    render(<TodayScreen />)
    await user.click(screen.getByText('Locked'))
    await user.click(screen.getByRole('button', { name: /delete locked/i }))

    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
  })
})


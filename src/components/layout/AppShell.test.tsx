import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { addDays, localToday } from '@/lib/utils/date'
import { AppShell } from '@/components/layout/AppShell'

const today = localToday()

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useUIStore.setState({ activeModal: null, toast: null })
})

describe('AppShell icon dock', () => {
  it('opens Backlog, History, Poo Pile, and Settings from their dock icons', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Pantry' }))
    expect(screen.getByText(/chuck your tasks in here/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText(/no circles finished yet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Poo Pile' }))
    expect(screen.getByText(/nothing digested yet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText(/day ends at/i)).toBeInTheDocument()
  })

  it('opens Add Task from its dock icon, captures the task, and plants it into an open circle', async () => {
    const user = userEvent.setup()
    const circle = { id: 'c1', date: today, stomachMinutes: 120, state: 'active' as const }
    await db.circles.put(circle)
    useCircleStore.getState().setAll([circle])

    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.type(screen.getByPlaceholderText(/what needs doing/i), 'From the dock')
    await user.click(screen.getByRole('button', { name: '30m' }))
    await user.click(screen.getByRole('button', { name: /feed it to duck2/i }))

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'From the dock')
      expect(created?.state).toBe('planned')
      expect(created?.circleId).toBe('c1')
    })
  })

  it('reveals bite sizes only once the task has a name, and Enter feeds it with the default 30m', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Add task' }))
    expect(screen.queryByRole('button', { name: '30m' })).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/what needs doing/i), 'Quick one')
    expect(screen.getByRole('button', { name: '30m' })).toHaveAttribute('aria-pressed', 'true')
    // Extras (due date / tags) wait until a bite size is actually picked.
    expect(screen.queryByRole('button', { name: /due date/i })).not.toBeInTheDocument()

    await user.keyboard('{Enter}')

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'Quick one')
      expect(created?.estimateMinutes).toBe(30)
    })
    expect(await screen.findByRole('status')).toHaveTextContent(/tucked in the pantry/i)
  })

  it('adds a due date and tags through the optional extras', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.type(screen.getByPlaceholderText(/what needs doing/i), 'Taxes')
    await user.click(screen.getByRole('button', { name: '2h' }))
    await user.click(screen.getByRole('button', { name: /due date/i }))
    await user.click(screen.getByRole('button', { name: 'tomorrow' }))
    await user.click(screen.getByRole('button', { name: /tags/i }))
    await user.type(screen.getByPlaceholderText(/work, urgent/i), 'admin{Enter}boring,')
    await user.click(screen.getByRole('button', { name: /tuck into the pantry/i }))

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'Taxes')
      expect(created?.estimateMinutes).toBe(120)
      expect(created?.deadline).toBe(addDays(today, 1))
      expect(created?.tags).toEqual(['admin', 'boring'])
    })
  })

  it('just captures to backlog via Add Task when there is no open circle', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.type(screen.getByPlaceholderText(/what needs doing/i), 'Someday')
    await user.click(screen.getByRole('button', { name: '15m' }))
    await user.click(screen.getByRole('button', { name: /tuck into the pantry/i }))

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'Someday')
      expect(created?.state).toBe('backlog')
    })
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { localToday } from '@/lib/utils/date'
import { AppShell } from '@/components/layout/AppShell'

const today = localToday()

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useUIStore.setState({ activeModal: null })
})

describe('AppShell icon dock', () => {
  it('opens Backlog, History, Poo Pile, and Settings from their dock icons', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>main content</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Backlog' }))
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
    await user.click(screen.getByRole('button', { name: /add to backlog/i }))

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'From the dock')
      expect(created?.state).toBe('planned')
      expect(created?.circleId).toBe('c1')
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
    await user.click(screen.getByRole('button', { name: /add to backlog/i }))

    await waitFor(() => {
      const created = useTaskStore.getState().tasks.find((t) => t.title === 'Someday')
      expect(created?.state).toBe('backlog')
    })
  })
})

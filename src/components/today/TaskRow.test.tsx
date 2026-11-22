import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { usePooStore } from '@/stores/usePooStore'
import { TaskRow } from '@/components/today/TaskRow'
import type { Task } from '@/types/models'

const task: Task = {
  id: 't1',
  title: 'Ship it',
  estimateMinutes: 30,
  remainingMinutes: 30,
  state: 'planned',
  circleId: 'c1',
  sortIndex: 0,
  createdAt: '2026-07-10T00:00:00.000Z',
}

beforeEach(async () => {
  await db.tasks.clear()
  await db.poos.clear()
  useTaskStore.setState({ tasks: [task] })
  usePooStore.setState({ poos: [] })
})

describe('TaskRow completion micro-animation (design tokens spec)', () => {
  it('pulses immediately on click, then completes the task shortly after', async () => {
    const user = userEvent.setup()
    render(
      <TaskRow task={task} today="2026-07-13" onNibble={() => {}} onEdit={() => {}} onDragStart={() => {}} onDragOver={() => {}} onDrop={() => {}} />,
    )

    const completeButton = screen.getByRole('button', { name: /complete ship it/i })
    await user.click(completeButton)

    // Pulse fires synchronously; the actual state transition is deferred.
    expect(completeButton.parentElement?.className).toContain('animate-complete-pulse')
    expect(useTaskStore.getState().tasks[0].state).toBe('planned')
    expect(completeButton).toBeDisabled()

    await waitFor(() => expect(useTaskStore.getState().tasks[0].state).toBe('completed'))
    expect(usePooStore.getState().poos).toHaveLength(1)
  })

  it('ignores a second click while the completion pulse is already in flight', async () => {
    const user = userEvent.setup()
    render(
      <TaskRow task={task} today="2026-07-13" onNibble={() => {}} onEdit={() => {}} onDragStart={() => {}} onDragOver={() => {}} onDrop={() => {}} />,
    )

    const completeButton = screen.getByRole('button', { name: /complete ship it/i })
    await user.click(completeButton)
    await user.click(completeButton) // disabled — should be a no-op

    await waitFor(() => expect(useTaskStore.getState().tasks[0].state).toBe('completed'))
    expect(usePooStore.getState().poos).toHaveLength(1) // exactly one, not two
  })
})

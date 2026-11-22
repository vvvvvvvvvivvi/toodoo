import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { BacklogScreen } from '@/screens/BacklogScreen'
import type { Task } from '@/types/models'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 30,
    state: 'backlog',
    sortIndex: 0,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

async function seed(tasks: Task[]) {
  await db.tasks.bulkPut(tasks)
  useTaskStore.getState().setAll(tasks)
}

beforeEach(async () => {
  await db.tasks.clear()
  useTaskStore.setState({ tasks: [] })
})

describe('BacklogScreen (capture flow)', () => {
  it('shows the empty state with no backlog tasks', () => {
    render(<BacklogScreen />)
    expect(screen.getByText(/Chuck your tasks in here/i)).toBeInTheDocument()
  })

  it('shows existing backlog tasks', async () => {
    await seed([task({ id: 't1', title: 'Write report', estimateMinutes: 60 })])
    render(<BacklogScreen />)
    expect(screen.getByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('60m')).toBeInTheDocument()
  })

  it('edits an existing task by tapping its row', async () => {
    const user = userEvent.setup()
    await seed([task({ id: 't1', title: 'Draft' })])
    render(<BacklogScreen />)

    await user.click(screen.getByText('Draft'))
    const titleInput = await screen.findByDisplayValue('Draft')
    await user.clear(titleInput)
    await user.type(titleInput, 'Final draft')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByText('Final draft')).toBeInTheDocument())
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('rejects editing to an empty title', async () => {
    const user = userEvent.setup()
    await seed([task({ id: 't1', title: 'Draft' })])
    render(<BacklogScreen />)

    await user.click(screen.getByText('Draft'))
    const titleInput = await screen.findByDisplayValue('Draft')
    await user.clear(titleInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/give it a name/i)).toBeInTheDocument()
    expect((await db.tasks.get('t1'))?.title).toBe('Draft') // unchanged
  })

  it('deletes a task via its row delete button', async () => {
    const user = userEvent.setup()
    await seed([task({ id: 't1', title: 'Throwaway' })])
    render(<BacklogScreen />)

    await user.click(screen.getByRole('button', { name: /delete throwaway/i }))

    await waitFor(() => expect(screen.queryByText('Throwaway')).not.toBeInTheDocument())
    expect(screen.getByText(/Chuck your tasks in here/i)).toBeInTheDocument()
    expect(await db.tasks.count()).toBe(0)
  })
})

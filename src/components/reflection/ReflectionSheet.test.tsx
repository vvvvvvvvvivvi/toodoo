import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useReflectionStore } from '@/stores/useReflectionStore'
import { useUIStore } from '@/stores/useUIStore'
import { ReflectionSheet } from '@/components/reflection/ReflectionSheet'
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

beforeEach(async () => {
  await db.tasks.clear()
  await db.reflections.clear()
  useTaskStore.setState({ tasks: [] })
  useReflectionStore.setState({ reflections: [] })
  useUIStore.setState({ pendingReflection: false, reflectionSummaries: [] })
})

describe('ReflectionSheet', () => {
  it('renders nothing when there is no pending reflection', () => {
    render(<ReflectionSheet />)
    expect(screen.queryByText(/HONK/)).not.toBeInTheDocument()
  })

  it('shows the full-digestion copy when nothing is left in the pantry', () => {
    useUIStore.setState({
      pendingReflection: true,
      reflectionSummaries: [{ circleId: 'c1', date: '2026-07-13', digestedTaskIds: ['a', 'b'], pantryTaskIds: [] }],
    })

    render(<ReflectionSheet />)
    expect(screen.getByText('HONK. Fully digested. Come admire the pile.')).toBeInTheDocument()
  })

  it('shows the partial-digestion copy with counts, and a pin-to-tomorrow row per pantry task', async () => {
    const user = userEvent.setup()
    const leftover = task({ id: 'leftover', title: 'Unfinished business' })
    await db.tasks.put(leftover)
    useTaskStore.getState().setAll([leftover])
    useUIStore.setState({
      pendingReflection: true,
      reflectionSummaries: [
        { circleId: 'c1', date: '2026-07-13', digestedTaskIds: ['done'], pantryTaskIds: ['leftover'] },
      ],
    })

    render(<ReflectionSheet />)

    expect(
      screen.getByText('1 digested, 1 back in the pantry for later. No judgement. Some honking.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unfinished business')).toBeInTheDocument()

    const pinButton = screen.getByRole('button', { name: /pin to tomorrow/i })
    await user.click(pinButton)

    await waitFor(() => expect(useTaskStore.getState().tasks[0].deadline).toBeDefined())
    // Visible confirmation so a successful click doesn't look like a no-op.
    expect(await screen.findByRole('button', { name: /pinned/i })).toBeDisabled()
  })

  it('records the picked mood and closes on Done', async () => {
    const user = userEvent.setup()
    useUIStore.setState({
      pendingReflection: true,
      reflectionSummaries: [{ circleId: 'c1', date: '2026-07-13', digestedTaskIds: ['a'], pantryTaskIds: [] }],
    })

    render(<ReflectionSheet />)
    await user.click(screen.getByRole('button', { name: 'Good' }))

    await waitFor(() => {
      const reflection = useReflectionStore.getState().reflections.find((r) => r.mood)
      expect(reflection?.mood).toBe('good')
    })

    await user.click(screen.getByRole('button', { name: /^done$/i }))
    expect(useUIStore.getState().pendingReflection).toBe(false)
  })
})

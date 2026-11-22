import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/lib/db/db'
import { useTaskStore } from '@/stores/useTaskStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { useUIStore } from '@/stores/useUIStore'
import { localToday } from '@/lib/utils/date'
import { TodayScreen } from '@/screens/TodayScreen'
import { BacklogScreen } from '@/screens/BacklogScreen'
import { TriageModal } from '@/components/today/TriageModal'
import type { Circle, Task } from '@/types/models'

const today = localToday()

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    estimateMinutes: 30,
    remainingMinutes: 30,
    state: 'planned',
    circleId: 'c1',
    sortIndex: 0,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

async function seed(tasks: Task[], circles: Circle[]) {
  await db.tasks.bulkPut(tasks)
  await db.circles.bulkPut(circles)
  useTaskStore.getState().setAll(tasks)
  useCircleStore.getState().setAll(circles)
}

beforeEach(async () => {
  await db.tasks.clear()
  await db.circles.clear()
  useTaskStore.setState({ tasks: [] })
  useCircleStore.setState({ circles: [] })
  useUIStore.setState({ triage: null })
})

describe('Save-gate: circle creation auto-activates, or opens triage if already overflowing (no Feed the Goose button anymore)', () => {
  it('creates the circle already active when everything fits', async () => {
    const user = userEvent.setup()
    render(
      <>
        <TodayScreen />
        <TriageModal />
      </>,
    )

    await user.click(screen.getByRole('button', { name: '8h' }))
    await user.click(screen.getByRole('button', { name: /let's go/i }))

    await waitFor(() => expect(useCircleStore.getState().circles[0]?.state).toBe('active'))
    expect(screen.queryByRole('button', { name: /feed the goose/i })).not.toBeInTheDocument()
  })

  it('opens triage automatically when auto-planted overdue tasks already overflow the chosen stomach, then activates once resolved', async () => {
    const user = userEvent.setup()
    const overdue = task({
      id: 'overdue',
      state: 'backlog',
      circleId: undefined,
      deadline: today,
      remainingMinutes: 500,
    })
    await seed([overdue], [])

    render(
      <>
        <TodayScreen />
        <TriageModal />
      </>,
    )

    await user.click(screen.getByRole('button', { name: '8h' })) // 480m — less than the overdue task's 500m
    await user.click(screen.getByRole('button', { name: /let's go/i }))

    expect(await screen.findByText("That's more than duck2 can stomach")).toBeInTheDocument()
    expect(useCircleStore.getState().circles[0].state).toBe('planning') // not activated yet

    await user.click(screen.getByRole('button', { name: /grow the stomach to 500m/i }))

    await waitFor(() => expect(useCircleStore.getState().circles[0].state).toBe('active'))
    expect(screen.queryByText("That's more than duck2 can stomach")).not.toBeInTheDocument()
  })
})

describe('Triage ordering and split (Invariant 4)', () => {
  it('shows split before returnToBacklog/shrink/delete, and split resolves the overflow', async () => {
    const user = userEvent.setup()
    const circle: Circle = { id: 'c1', date: today, stomachMinutes: 50, state: 'active' }
    await seed([task({ id: 'big', title: 'Big', remainingMinutes: 70 })], [circle])

    render(
      <>
        <TodayScreen />
        <TriageModal />
      </>,
    )

    await user.click(screen.getByText(/tap to sort it out/i))
    const headings = await screen.findAllByRole('heading', { level: 3 })
    expect(headings.map((h) => h.textContent)).toEqual([
      'Split a task',
      'Send back to the pantry',
      'Shrink an estimate',
      'Delete',
    ])

    await user.click(screen.getByRole('button', { name: /split "big"/i }))

    await waitFor(() => expect(useUIStore.getState().triage).toBeNull())
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(2)
    expect(tasks.find((t) => t.state === 'planned')?.remainingMinutes).toBe(50)
    expect(tasks.find((t) => t.state === 'backlog')?.remainingMinutes).toBe(20)
  })
})

describe('Restricted triage set for locked-only overflow (Invariant 3)', () => {
  it('offers only moveDeadline/shrink/growStomach, and growStomach resolves it', async () => {
    const user = userEvent.setup()
    const circle: Circle = { id: 'c1', date: today, stomachMinutes: 50, state: 'active' }
    await seed([task({ id: 'locked', remainingMinutes: 70, deadline: today })], [circle])

    render(
      <>
        <TodayScreen />
        <TriageModal />
      </>,
    )

    await user.click(screen.getByText(/tap to sort it out/i))
    const headings = await screen.findAllByRole('heading', { level: 3 })
    expect(headings.map((h) => h.textContent)).toEqual(['Move a deadline', 'Shrink an estimate'])

    await user.click(screen.getByRole('button', { name: /grow the stomach to 70m/i }))

    await waitFor(() => expect(useCircleStore.getState().circles[0].stomachMinutes).toBe(70))
    expect(useUIStore.getState().triage).toBeNull()
  })
})

describe('Backlog "Add to Today" blocked mutation replays after triage resolution', () => {
  it('blocks the add, then commits it once another task is shrunk to make room', async () => {
    const user = userEvent.setup()
    const circle: Circle = { id: 'c1', date: today, stomachMinutes: 40, state: 'active' }
    await seed(
      [
        task({ id: 'already-planned', estimateMinutes: 30, remainingMinutes: 30 }),
        task({ id: 'to-add', state: 'backlog', circleId: undefined, remainingMinutes: 20 }),
      ],
      [circle],
    )

    render(
      <>
        <BacklogScreen />
        <TriageModal />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /add task to today/i }))

    expect(await screen.findByText("That's more than duck2 can stomach")).toBeInTheDocument()
    expect(useUIStore.getState().triage?.pendingRequest).toEqual({
      kind: 'addTaskToCircle',
      circleId: 'c1',
      taskId: 'to-add',
    })

    const shrinkInput = screen.getByRole('spinbutton')
    await user.clear(shrinkInput)
    await user.type(shrinkInput, '20')
    await user.click(screen.getByRole('button', { name: /^shrink$/i }))

    await waitFor(() => expect(useUIStore.getState().triage).toBeNull())
    const addedTask = useTaskStore.getState().tasks.find((t) => t.id === 'to-add')
    expect(addedTask?.state).toBe('planned')
    expect(addedTask?.circleId).toBe('c1')
  })
})

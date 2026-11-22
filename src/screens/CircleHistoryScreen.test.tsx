import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useCircleStore } from '@/stores/useCircleStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { CircleHistoryScreen } from '@/screens/CircleHistoryScreen'
import type { Circle, Task } from '@/types/models'

beforeEach(() => {
  useCircleStore.setState({ circles: [] })
  useTaskStore.setState({ tasks: [] })
})

describe('CircleHistoryScreen', () => {
  it('shows the empty state with no past circles', () => {
    render(<CircleHistoryScreen />)
    expect(screen.getByText(/no circles finished yet/i)).toBeInTheDocument()
  })

  it('lists past circles with their digested tasks, newest first', () => {
    const circles: Circle[] = [
      { id: 'old', date: '2026-07-01', stomachMinutes: 240, state: 'cleanPlate' },
      { id: 'new', date: '2026-07-10', stomachMinutes: 480, state: 'abandoned' },
      { id: 'open', date: '2026-07-13', stomachMinutes: 480, state: 'active' },
    ]
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Old digested task',
        estimateMinutes: 30,
        remainingMinutes: 0,
        state: 'completed',
        circleId: 'old',
        sortIndex: 0,
        createdAt: '2026-07-01T00:00:00.000Z',
        completedAt: '2026-07-01T10:00:00.000Z',
      },
    ]
    useCircleStore.setState({ circles })
    useTaskStore.setState({ tasks })

    render(<CircleHistoryScreen />)

    const dates = screen.getAllByText(/2026-07-\d\d/)
    expect(dates.map((el) => el.textContent)).toEqual(['2026-07-10', '2026-07-01'])
    expect(screen.getByText('Old digested task')).toBeInTheDocument()
    expect(screen.getByText(/abandoned/i)).toBeInTheDocument()
    expect(screen.queryByText('2026-07-13')).not.toBeInTheDocument() // still-open circle excluded
  })
})

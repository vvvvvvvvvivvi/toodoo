import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePooStore } from '@/stores/usePooStore'
import { useCircleStore } from '@/stores/useCircleStore'
import { PooPileScreen } from '@/screens/PooPileScreen'
import type { Circle, Poo } from '@/types/models'

beforeEach(() => {
  usePooStore.setState({ poos: [] })
  useCircleStore.setState({ circles: [] })
})

describe('PooPileScreen', () => {
  it('shows the empty state with nothing earned yet', () => {
    render(<PooPileScreen />)
    expect(screen.getByText(/nothing digested yet/i)).toBeInTheDocument()
  })

  it('shows total count, size breakdown, and clean plate count', () => {
    const poos: Poo[] = [
      { id: 'p1', size: 'small', earnedAt: '2026-07-13T09:00:00.000Z', taskId: 't1' },
      { id: 'p2', size: 'medium', earnedAt: '2026-07-13T10:00:00.000Z', taskId: 't2' },
      { id: 'p3', size: 'large', earnedAt: '2026-07-01T10:00:00.000Z', taskId: 't3' },
    ]
    const circles: Circle[] = [
      { id: 'c1', date: '2026-07-01', stomachMinutes: 60, state: 'cleanPlate' },
      { id: 'c2', date: '2026-07-13', stomachMinutes: 60, state: 'cleanPlate' },
    ]
    usePooStore.setState({ poos })
    useCircleStore.setState({ circles })

    render(<PooPileScreen />)

    expect(screen.getByText('3')).toBeInTheDocument() // all-time total
    expect(screen.getByText(/🏆 2/)).toBeInTheDocument() // clean plates
  })
})

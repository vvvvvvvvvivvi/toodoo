import { describe, expect, it } from 'vitest'
import { useUIStore } from '@/stores/useUIStore'

describe('useUIStore', () => {
  it('opens/closes modals and manages triage/reflection flags', () => {
    useUIStore.getState().openModal('backlog')
    expect(useUIStore.getState().activeModal).toBe('backlog')

    useUIStore.getState().closeModal()
    expect(useUIStore.getState().activeModal).toBeNull()

    useUIStore.getState().openTriage({ circleId: 'c1', overflowMinutes: 30 })
    expect(useUIStore.getState().triage).toEqual({ circleId: 'c1', overflowMinutes: 30 })

    useUIStore.getState().closeTriage()
    expect(useUIStore.getState().triage).toBeNull()

    useUIStore.getState().setPendingReflection(true)
    expect(useUIStore.getState().pendingReflection).toBe(true)
  })
})

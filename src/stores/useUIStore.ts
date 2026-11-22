import { create } from 'zustand'
import type { CapacityMutationRequest } from '@/lib/mutations/circleMutations'
import type { CircleReflectionSummary } from '@/lib/mutations/reflectionMutations'

export type Modal = 'addTask' | 'backlog' | 'history' | 'pooPile' | 'settings'

export interface TriageContext {
  circleId: string
  overflowMinutes: number
  pendingRequest?: CapacityMutationRequest
}

interface UIStore {
  activeModal: Modal | null
  openModal: (modal: Modal) => void
  closeModal: () => void

  triage: TriageContext | null
  openTriage: (ctx: TriageContext) => void
  closeTriage: () => void

  pendingReflection: boolean
  reflectionSummaries: CircleReflectionSummary[]
  setPendingReflection: (pending: boolean) => void
  setReflectionSummaries: (summaries: CircleReflectionSummary[]) => void
  closeReflection: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  triage: null,
  openTriage: (ctx) => set({ triage: ctx }),
  closeTriage: () => set({ triage: null }),

  pendingReflection: false,
  reflectionSummaries: [],
  setPendingReflection: (pending) => set({ pendingReflection: pending }),
  setReflectionSummaries: (summaries) => set({ reflectionSummaries: summaries }),
  closeReflection: () => set({ pendingReflection: false, reflectionSummaries: [] }),
}))

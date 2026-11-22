import { create } from 'zustand'
import type { Poo } from '@/types/models'

interface PooStore {
  poos: Poo[]
  hydrate: (poos: Poo[]) => void
  setAll: (poos: Poo[]) => void
}

export const usePooStore = create<PooStore>((set) => ({
  poos: [],
  hydrate: (poos) => set({ poos }),
  setAll: (poos) => set({ poos }),
}))

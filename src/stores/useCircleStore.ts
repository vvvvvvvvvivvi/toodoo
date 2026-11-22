import { create } from 'zustand'
import type { Circle } from '@/types/models'

interface CircleStore {
  circles: Circle[]
  hydrate: (circles: Circle[]) => void
  setAll: (circles: Circle[]) => void
}

export const useCircleStore = create<CircleStore>((set) => ({
  circles: [],
  hydrate: (circles) => set({ circles }),
  setAll: (circles) => set({ circles }),
}))

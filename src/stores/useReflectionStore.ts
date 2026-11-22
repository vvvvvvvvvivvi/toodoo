import { create } from 'zustand'
import type { DayReflection } from '@/types/models'

interface ReflectionStore {
  reflections: DayReflection[]
  hydrate: (reflections: DayReflection[]) => void
  setAll: (reflections: DayReflection[]) => void
}

export const useReflectionStore = create<ReflectionStore>((set) => ({
  reflections: [],
  hydrate: (reflections) => set({ reflections }),
  setAll: (reflections) => set({ reflections }),
}))

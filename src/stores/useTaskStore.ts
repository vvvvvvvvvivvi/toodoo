import { create } from 'zustand'
import type { Task } from '@/types/models'

interface TaskStore {
  tasks: Task[]
  hydrate: (tasks: Task[]) => void
  setAll: (tasks: Task[]) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  hydrate: (tasks) => set({ tasks }),
  setAll: (tasks) => set({ tasks }),
}))

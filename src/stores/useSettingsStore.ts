import { create } from 'zustand'
import type { SettingsRecord } from '@/types/models'
import { DEFAULT_SETTINGS } from '@/lib/db/db'

interface SettingsStore {
  settings: SettingsRecord
  hydrate: (settings: SettingsRecord) => void
  update: (patch: Partial<SettingsRecord>) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  hydrate: (settings) => set({ settings }),
  update: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
}))

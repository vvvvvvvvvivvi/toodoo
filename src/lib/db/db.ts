import Dexie, { type Table } from 'dexie'
import type { Circle, DayReflection, Poo, SettingsRecord, Task } from '@/types/models'

export class ToodooDB extends Dexie {
  tasks!: Table<Task, string>
  circles!: Table<Circle, string>
  poos!: Table<Poo, string>
  reflections!: Table<DayReflection, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('toodoo')
    this.version(1).stores({
      tasks: 'id, state, circleId, deadline, createdAt, sortIndex',
      circles: 'id, date, state',
      poos: 'id, taskId, earnedAt',
      reflections: 'date',
      settings: 'id',
    })
  }
}

export const db = new ToodooDB()

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'singleton',
  dayEndTime: '18:00',
  defaultStomachMinutes: 480,
  notificationsEnabled: false,
  fillMyDayDismissedDate: null,
  firstRunComplete: false,
}

import { describe, expect, it } from 'vitest'
import { getCirclesNeedingClosure } from '@/lib/invariants/dayEnd'
import type { Circle, SettingsRecord } from '@/types/models'

const settings: SettingsRecord = {
  id: 'singleton',
  dayEndTime: '18:00',
  defaultStomachMinutes: 480,
  notificationsEnabled: false,
  fillMyDayDismissedDate: null,
  firstRunComplete: true,
}

function circle(overrides: Partial<Circle>): Circle {
  return { id: 'c1', date: '2026-07-13', stomachMinutes: 480, state: 'active', ...overrides }
}

describe('getCirclesNeedingClosure (Invariants 11 & 12)', () => {
  it('closes a stale circle from a previous day regardless of the clock', () => {
    const circles = [circle({ date: '2026-07-10' })]
    const now = new Date(2026, 6, 13, 9, 0) // local 09:00, well before day-end
    expect(getCirclesNeedingClosure(circles, settings, now)).toEqual(circles)
  })

  it('leaves today\'s circle open before the day-end time', () => {
    const circles = [circle({ date: '2026-07-13' })]
    const now = new Date(2026, 6, 13, 17, 59)
    expect(getCirclesNeedingClosure(circles, settings, now)).toEqual([])
  })

  it("closes today's circle once the local clock passes day-end time", () => {
    const circles = [circle({ date: '2026-07-13' })]
    const now = new Date(2026, 6, 13, 18, 0)
    expect(getCirclesNeedingClosure(circles, settings, now)).toEqual(circles)
  })

  it('ignores circles already ended (cleanPlate/abandoned/closed)', () => {
    const circles = [circle({ date: '2026-07-01', state: 'cleanPlate' })]
    const now = new Date(2026, 6, 13, 20, 0)
    expect(getCirclesNeedingClosure(circles, settings, now)).toEqual([])
  })

  it('respects a user-overridden day-end time', () => {
    const earlySettings: SettingsRecord = { ...settings, dayEndTime: '15:00' }
    const circles = [circle({ date: '2026-07-13' })]
    const now = new Date(2026, 6, 13, 16, 0)
    expect(getCirclesNeedingClosure(circles, earlySettings, now)).toEqual(circles)
  })
})

import { useState } from 'react'
import { updateSettings } from '@/lib/mutations/settingsMutations'

interface DefaultStomachSettingProps {
  defaultStomachMinutes: number
}

export function DefaultStomachSetting({ defaultStomachMinutes }: DefaultStomachSettingProps) {
  const [hours, setHours] = useState(String(defaultStomachMinutes / 60))

  function commit() {
    const parsed = Number(hours)
    if (Number.isFinite(parsed) && parsed > 0) {
      updateSettings({ defaultStomachMinutes: Math.round(parsed * 60) })
    }
  }

  return (
    <label className="flex items-center justify-between rounded-2xl bg-circle-empty/50 px-4 py-3">
      <span className="font-body text-text-primary">Default stomach (hours)</span>
      <input
        type="number"
        min={0.5}
        step={0.5}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        onBlur={commit}
        className="w-20 rounded-lg border border-circle-empty bg-background px-2 py-1 text-right font-body text-text-primary"
      />
    </label>
  )
}

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
    <label className="flex items-center justify-between card px-4 py-3">
      <span className="font-body text-text-primary">Default stomach (hours)</span>
      <input
        type="number"
        min={0.5}
        step={0.5}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        onBlur={commit}
        className="w-20 input-cute px-2 py-1 text-right font-body text-text-primary"
      />
    </label>
  )
}

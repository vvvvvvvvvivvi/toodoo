import { updateSettings } from '@/lib/mutations/settingsMutations'

interface DayEndTimeSettingProps {
  dayEndTime: string
}

export function DayEndTimeSetting({ dayEndTime }: DayEndTimeSettingProps) {
  return (
    <label className="flex items-center justify-between card px-4 py-3">
      <span className="font-body text-text-primary">Day ends at</span>
      <input
        type="time"
        value={dayEndTime}
        onChange={(e) => updateSettings({ dayEndTime: e.target.value })}
        className="input-cute px-2 py-1 font-body text-text-primary"
      />
    </label>
  )
}

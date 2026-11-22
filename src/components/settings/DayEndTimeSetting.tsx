import { updateSettings } from '@/lib/mutations/settingsMutations'

interface DayEndTimeSettingProps {
  dayEndTime: string
}

export function DayEndTimeSetting({ dayEndTime }: DayEndTimeSettingProps) {
  return (
    <label className="flex items-center justify-between rounded-2xl bg-circle-empty/50 px-4 py-3">
      <span className="font-body text-text-primary">Day ends at</span>
      <input
        type="time"
        value={dayEndTime}
        onChange={(e) => updateSettings({ dayEndTime: e.target.value })}
        className="rounded-lg border border-circle-empty bg-background px-2 py-1 font-body text-text-primary"
      />
    </label>
  )
}

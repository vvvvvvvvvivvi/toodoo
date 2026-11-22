import { useSettingsStore } from '@/stores/useSettingsStore'
import { DayEndTimeSetting } from '@/components/settings/DayEndTimeSetting'
import { DefaultStomachSetting } from '@/components/settings/DefaultStomachSetting'
import { NotificationToggle } from '@/components/settings/NotificationToggle'

export function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings)

  return (
    <div className="flex flex-col gap-3">
      <DayEndTimeSetting dayEndTime={settings.dayEndTime} />
      <DefaultStomachSetting defaultStomachMinutes={settings.defaultStomachMinutes} />
      <NotificationToggle notificationsEnabled={settings.notificationsEnabled} />
    </div>
  )
}

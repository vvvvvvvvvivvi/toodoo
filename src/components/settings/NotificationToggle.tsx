import { requestNotificationPermission, updateSettings } from '@/lib/mutations/settingsMutations'

interface NotificationToggleProps {
  notificationsEnabled: boolean
}

export function NotificationToggle({ notificationsEnabled }: NotificationToggleProps) {
  async function handleToggle() {
    if (notificationsEnabled) {
      await updateSettings({ notificationsEnabled: false })
      return
    }
    await requestNotificationPermission()
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex items-center justify-between rounded-2xl bg-circle-empty/50 px-4 py-3 text-left"
    >
      <span className="font-body text-text-primary">Day-end notification</span>
      <span
        className={`rounded-full px-3 py-1 font-body text-xs ${
          notificationsEnabled ? 'bg-accent text-background' : 'bg-background text-text-secondary'
        }`}
      >
        {notificationsEnabled ? 'On' : 'Off'}
      </span>
    </button>
  )
}

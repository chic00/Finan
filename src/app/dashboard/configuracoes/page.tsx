import { getNotificationSettings } from '@/actions/notifications'
import { auth } from '@/lib/auth'
import { NotificationSettingsClient } from '@/components/settings/NotificationSettingsClient'

export default async function ConfiguracoesPage() {
  const session = await auth()
  const settings = await getNotificationSettings()

  return (
    <NotificationSettingsClient
      settings={settings ?? null}
      userEmail={session?.user?.email || ''}
    />
  )
}
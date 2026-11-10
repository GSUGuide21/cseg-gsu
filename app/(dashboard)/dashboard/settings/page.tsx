import { requireOfficer } from '@/lib/dashboard/dal'
import { getSettings } from '@/lib/dashboard/queries'

import { SettingsView } from './SettingsView'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { officer } = await requireOfficer()
  const { settings, officers, terms } = await getSettings()
  return <SettingsView settings={settings} officers={officers} terms={terms} me={officer.email} isAdmin={officer.role === 'admin'} />
}

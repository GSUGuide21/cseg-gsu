import { requireOfficer } from '@/lib/dashboard/dal'
import { listRedirects } from '@/lib/dashboard/queries'

import { RedirectsView } from './RedirectsView'

export const metadata = { title: 'Old links' }

export default async function DashboardRedirectsPage() {
  await requireOfficer()
  return <RedirectsView redirects={await listRedirects()} />
}

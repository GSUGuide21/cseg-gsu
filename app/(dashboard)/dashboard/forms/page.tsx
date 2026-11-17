import { listForms } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { FormsView } from '../content/views'

export const metadata = { title: 'Forms' }

export default async function DashboardFormsPage() {
  await requireOfficer()
  return <FormsView rows={await listForms()} />
}

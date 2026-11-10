import { requireOfficer } from '@/lib/dashboard/dal'
import { listFaqs } from '@/lib/dashboard/queries'

import { FaqsView } from './FaqsView'

export const metadata = { title: 'Questions' }

export default async function DashboardFaqsPage() {
  await requireOfficer()
  return <FaqsView faqs={await listFaqs()} />
}

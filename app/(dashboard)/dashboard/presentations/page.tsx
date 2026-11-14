import { requireOfficer } from '@/lib/dashboard/dal'
import { listPresentations } from '@/lib/dashboard/queries'

import { DocumentList } from '../DocumentList'

export const metadata = { title: 'Presentations' }

export default async function PresentationsPage() {
  await requireOfficer()
  const docs = await listPresentations()
  // Visibility comes along in each row, for the list's badge and filter
  return <DocumentList kind="presentation" docs={docs.map(({ slides, ...d }) => ({ ...d, by: d.author_email, slideCount: Array.isArray(slides) ? slides.length : 0 }))} />
}

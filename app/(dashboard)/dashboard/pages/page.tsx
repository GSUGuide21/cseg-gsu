import { requireOfficer } from '@/lib/dashboard/dal'
import { listPages } from '@/lib/dashboard/queries'

import { DocumentList } from '../DocumentList'

export const metadata = { title: 'Pages' }

export default async function PagesPage() {
  await requireOfficer()
  const docs = await listPages()
  return <DocumentList kind="page" docs={docs.map((d) => ({ ...d, by: d.updated_by }))} />
}

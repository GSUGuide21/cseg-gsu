import { requireOfficer } from '@/lib/dashboard/dal'
import { listPages } from '@/lib/dashboard/queries'
import { pageHref } from '@/lib/sitePages'

import { DocumentList } from '../DocumentList'

export const metadata = { title: 'Pages' }

export default async function PagesPage() {
  await requireOfficer()
  const docs = await listPages()
  const slugOf = new Map(docs.map((d) => [d.id, d.slug]))
  return <DocumentList kind="page" docs={docs.map((d) => ({ ...d, by: d.updated_by, href: pageHref(d.slug, d.parent_id ? slugOf.get(d.parent_id) : null) }))} />
}

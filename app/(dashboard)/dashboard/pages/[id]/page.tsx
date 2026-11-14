import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPage, listMenus, listPageTree } from '@/lib/dashboard/queries'

import { DocumentEditor } from '../../DocumentEditor'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { officer } = await requireOfficer()
  const { id } = await params
  // Not a uuid: no such page (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [doc, pages, menus] = await Promise.all([getPage(id), listPageTree(), listMenus()])
  if (!doc) notFound()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor me={{ name: officer.name ?? officer.email.split('@')[0], email: officer.email }} kind="page" doc={doc} pages={pages} menus={menus} />
    </SiteContentProvider>
  )
}

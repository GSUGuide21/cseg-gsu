import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { listMenus, listPageTree } from '@/lib/dashboard/queries'

import { DocumentEditor } from '../../DocumentEditor'

export const metadata = { title: 'New page' }

export default async function NewPagePage() {
  await requireOfficer()
  const [pages, menus] = await Promise.all([listPageTree(), listMenus()])
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor kind="page" doc={null} pages={pages} menus={menus} />
    </SiteContentProvider>
  )
}

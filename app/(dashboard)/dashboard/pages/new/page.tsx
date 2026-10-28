import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'

import { DocumentEditor } from '../../DocumentEditor'

export const metadata = { title: 'New page' }

export default async function NewPagePage() {
  await requireOfficer()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor kind="page" doc={null} />
    </SiteContentProvider>
  )
}

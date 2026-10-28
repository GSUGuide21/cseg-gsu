import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'

import { DocumentEditor } from '../../DocumentEditor'

export const metadata = { title: 'New post' }

export default async function NewPostPage() {
  await requireOfficer()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor kind="post" doc={null} />
    </SiteContentProvider>
  )
}

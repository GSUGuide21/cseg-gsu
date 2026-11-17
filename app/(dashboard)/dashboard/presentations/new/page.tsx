import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'

import { PresentationEditor } from '../PresentationEditor'

export const metadata = { title: 'New presentation' }

export default async function NewPresentationPage() {
  await requireOfficer()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <PresentationEditor doc={null} />
    </SiteContentProvider>
  )
}

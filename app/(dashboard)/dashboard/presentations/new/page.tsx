import { requireOfficer } from '@/lib/dashboard/dal'

import { PresentationEditor } from '../PresentationEditor'

export const metadata = { title: 'New presentation' }

export default async function NewPresentationPage() {
  await requireOfficer()
  return <PresentationEditor doc={null} />
}

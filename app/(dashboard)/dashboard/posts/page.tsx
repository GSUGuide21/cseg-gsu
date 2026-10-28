import { requireOfficer } from '@/lib/dashboard/dal'
import { listPosts } from '@/lib/dashboard/queries'

import { DocumentList } from '../DocumentList'

export const metadata = { title: 'Posts' }

export default async function PostsPage() {
  await requireOfficer()
  const docs = await listPosts()
  return <DocumentList kind="post" docs={docs.map((d) => ({ ...d, by: d.author_email }))} />
}

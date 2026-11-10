import { getPublishedPosts } from '@/lib/dashboard/public'
import { rssFeed } from '@/lib/feed'

// New posts show up within five minutes, as on /posts
export const revalidate = 300

/** The club's posts as RSS, for feed readers */
export async function GET() {
  return new Response(rssFeed(await getPublishedPosts()), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}

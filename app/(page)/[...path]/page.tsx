import { notFound, redirect } from 'next/navigation'

import { getRedirect } from '@/lib/dashboard/public'
import { redirectPathFrom } from '@/lib/dashboard/validate'

// A redirect added or changed in the dashboard refreshes this sooner
export const revalidate = 300

/**
 * Any address no page answers. If officers forwarded it from the dashboard's Redirects, it
 * goes where they pointed it (a temporary redirect, so changing it later takes); otherwise
 * it's not found, in the site's own header and footer.
 */
export default async function ForwardedAddress({ params }: { params: Promise<{ path: string[] }> }) {
  const path = redirectPathFrom(`/${(await params).path.join('/')}`)
  // A missing file (an image, a script) is just missing; only page addresses are forwarded
  const to = /\.[a-z0-9]+$/.test(path) ? null : await getRedirect(path)
  if (to) redirect(to)
  notFound()
}

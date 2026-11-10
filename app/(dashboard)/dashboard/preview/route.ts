import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { requireOfficer } from '@/lib/dashboard/dal'
import { pageHref } from '@/lib/sitePages'

/**
 * "Preview on the site", from the editor: /dashboard/preview?kind=page&id=…
 *
 * Officers only (anyone else is sent to sign in). Turns on draft mode for this browser, so
 * the site shows drafts at their own address, then goes there. The address comes from the
 * saved page or post, never the link, so this can't send anyone elsewhere. The banner on
 * the site turns it off again.
 */
export async function GET(request: Request) {
  const { supabase } = await requireOfficer()
  const params = new URL(request.url).searchParams
  const kind = params.get('kind')
  const id = params.get('id') ?? ''
  if ((kind !== 'page' && kind !== 'post') || !/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not something to preview', { status: 400 })

  const { data } = await supabase.from(kind === 'page' ? 'pages' : 'posts').select('slug').eq('id', id).maybeSingle()
  if (!data) return new Response('No such page or post', { status: 404 })

  ;(await draftMode()).enable()
  redirect(kind === 'page' ? pageHref(data.slug) : `/posts/${data.slug}`)
}

/**
 * Puts the site's own pages (About, Join, Contact, Resources, Places to Eat) in the dashboard, as drafts
 * laid out in sections, so officers can edit them there. A draft changes nothing on the
 * site: once one is published, it shows at that page's path in place of the code's.
 *
 *   npm run pages:seed            shows what it would add
 *   npm run pages:seed -- --write adds them
 *
 * It never changes a page that's already there (one with the same web address is left
 * alone). Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { SITE_PAGE_SEEDS } from './site-pages'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data: existing, error } = await supabase
    .from('pages')
    .select('slug, status')
    .in(
      'slug',
      SITE_PAGE_SEEDS.map((p) => p.slug)
    )
  if (error) throw error
  const taken = new Map((existing ?? []).map((p) => [p.slug as string, p.status as string]))

  for (const page of SITE_PAGE_SEEDS) {
    const blocks = page.sections.reduce((n, s) => n + (JSON.parse(s.body).root.children as unknown[]).length, 0)
    const summary = `${page.slug}: "${page.title}", ${page.sections.length} sections, ${blocks} blocks`
    if (taken.has(page.slug)) {
      console.log(`skip  ${summary} (a ${taken.get(page.slug)} page is already at /${page.slug})`)
      continue
    }
    if (!write) {
      console.log(`would add  ${summary}`)
      continue
    }
    const { error: insertError } = await supabase.from('pages').insert({
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      description: page.description,
      layout: 'sections',
      sections: page.sections,
      body: '',
      status: 'draft',
    })
    if (insertError) throw insertError
    console.log(`added  ${summary}, as a draft`)
  }
  if (!write) console.log('\nNothing written. Run with --write to add them.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

/**
 * Adds the core values to the About page officers already have in the dashboard (the one
 * that shows at /about once published): a Core values section, after Mission & purpose,
 * as a fresh seed has it. Pages seeded before the values existed don't have one, and the
 * seed never changes a page that's there.
 *
 *   npm run about:values            shows what it would change
 *   npm run about:values -- --write changes it
 *
 * It leaves the page alone if it already has the values (a Core values block, or a section
 * at #values). The page's revision history keeps the version from before, to restore from
 * Pages → About → History. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only
 * on your machine.
 */
import { CORE_VALUES_SECTION } from './site-pages'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data: page, error } = await supabase.from('pages').select('id, title, status, layout, sections').eq('slug', 'about').maybeSingle()
  if (error) throw error
  if (!page) return console.log('No About page in the dashboard; the site shows its own, which has the values already.')
  if (page.layout !== 'sections') return console.log(`About is written as a whole page, not in sections. Add the values by hand: Pages → About → Insert → Core values.`)

  const sections = page.sections ?? []
  if (sections.some((s) => s.anchor === 'values' || s.body.includes('"core-values"'))) return console.log(`About (${page.status}) has the core values already. Nothing to do.`)

  const after = sections.findIndex((s) => /mission/i.test(s.title))
  const at = after < 0 ? Math.min(1, sections.length) : after + 1
  const next = [...sections.slice(0, at), CORE_VALUES_SECTION(), ...sections.slice(at)]
  console.log(`About (${page.status}): would add "Our core values" as section ${at + 1} of ${next.length}, after "${sections[at - 1]?.title ?? 'the start'}".`)
  for (const [i, s] of next.entries()) console.log(`  ${i + 1}. ${s.title}${i === at ? '   ← new' : ''}`)
  if (!write) return console.log('\nNothing written. Run with --write to add it.')

  const { error: updateError } = await supabase.from('pages').update({ sections: next }).eq('id', page.id)
  if (updateError) throw updateError
  console.log(`\nAdded.${page.status === 'published' ? ' It shows on /about within five minutes.' : ''} The version from before is in the page's history.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

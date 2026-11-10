/**
 * Writes the homepage's built-in words (app/lib/homepage.ts) into the dashboard's homepage
 * row, so officers start from a saved copy under Homepage. The site looks the same after.
 *
 *   npm run homepage:seed                    shows what it would do
 *   npm run homepage:seed -- --write         writes them, if officers haven't saved any
 *   npm run homepage:seed -- --write --force writes them over what officers saved
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { BUILT_IN_HOMEPAGE } from '../app/lib/homepage'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const force = process.argv.includes('--force')
  const supabase = adminClient()

  const { data: row, error } = await supabase.from('homepage').select('content, updated_by').eq('id', 1).maybeSingle()
  if (error) throw new Error(`${error.message} (has the homepage migration been applied?)`)
  const hasSaved = !!row && typeof row.content === 'object' && row.content !== null && Object.keys(row.content).length > 0

  console.log(`hero: ${BUILT_IN_HOMEPAGE.hero.title}`)
  for (const s of BUILT_IN_HOMEPAGE.sections) console.log(`section: ${s.name} (${s.shown ? 'shown' : 'hidden'}): ${s.title}`)
  if (hasSaved && !force) return console.log(`\nOfficers already saved the homepage${row?.updated_by ? ` (${row.updated_by})` : ''}; left alone. Add --force to replace it.`)
  if (!write) return console.log(`\nNothing written. Run with --write to ${hasSaved ? 'replace the saved homepage' : 'save these'}.`)

  const { error: saveError } = row
    ? await supabase.from('homepage').update({ content: BUILT_IN_HOMEPAGE, updated_by: null }).eq('id', 1)
    : await supabase.from('homepage').insert({ id: 1, content: BUILT_IN_HOMEPAGE })
  if (saveError) throw saveError
  console.log('\nSaved the homepage.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

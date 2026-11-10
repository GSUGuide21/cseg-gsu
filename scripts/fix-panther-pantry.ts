/**
 * The seed never changes a place that's already there, so this corrects the 75 Piedmont row
 * in map_places: the Panther Pantry itself, not a pickup locker, is in the basement of the
 * Citizens Trust Building. Only those words change, so any other edits officers have made stay.
 *
 *   npx ts-node -T -P scripts/tsconfig.json scripts/fix-panther-pantry.ts            shows the change
 *   npx ts-node -T -P scripts/tsconfig.json scripts/fix-panther-pantry.ts --write    makes it
 *
 * Safe to run twice. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { adminClient } from './supabase-admin'

const SLUG = '75-piedmont'
const PANTRY = ['a Panther Pantry pickup locker (basement)', 'the Panther Pantry (basement)'] as const
const INTRO = ['The Graduation Office,', 'The Citizens Trust Building: the Graduation Office,'] as const

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data: row, error } = await supabase.from('map_places').select('id, name, description, published').eq('slug', SLUG).single()
  if (error) throw error
  const before = row.description ?? ''
  console.log(`${row.name} (${row.published ? 'published' : 'hidden'})\n\nNow:\n${before}\n`)

  if (before.includes(PANTRY[1]) && before.includes(INTRO[1])) return console.log('Already corrected. Nothing to do.')
  for (const [from, to] of [PANTRY, INTRO]) {
    if (!before.includes(from) && !before.includes(to)) throw new Error(`Not changing it: expected to find "${from}".`)
  }

  const after = before.replace(PANTRY[0], PANTRY[1]).replace(INTRO[0], INTRO[1])
  console.log(`After:\n${after}\n`)
  if (!write) return console.log('Nothing written. Run with --write to make the change.')

  // Matching the old text too means an edit made in the meantime isn't overwritten
  const { data: updated, error: updateError } = await supabase
    .from('map_places')
    .update({ description: after })
    .eq('id', row.id)
    .eq('description', before)
    .select('id')
  if (updateError) throw updateError
  if (updated?.length !== 1) throw new Error('The row changed while this ran; run it again.')
  console.log('Updated.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

/**
 * Copies the built-in past events (app/lib/data/events.ts) into the dashboard's events
 * table, under the same ids, so their check-ins stay with them. Once it has any, the site
 * shows its events instead, and officers edit them under Events.
 *
 *   npm run events:seed            shows what it would add
 *   npm run events:seed -- --write adds them
 *
 * It never changes an event that's already there (the same id is left alone). Uses
 * SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { BUILT_IN_EVENTS, eventToRow } from '../app/lib/events'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data, error } = await supabase.from('events').select('slug')
  if (error) throw new Error(`${error.message} (has the events migration been applied?)`)
  const taken = new Set((data ?? []).map((e) => e.slug))
  const events = BUILT_IN_EVENTS.map(eventToRow).filter((e) => !taken.has(e.slug))

  console.log(`${write ? 'add' : 'would add'}  ${events.length} of ${BUILT_IN_EVENTS.length} events`)
  for (const e of events) console.log(`  ${e.slug}: ${e.name}`)
  if (!write) return console.log('\nNothing written. Run with --write to add them.')
  if (events.length) {
    const { error: insertError } = await supabase.from('events').insert(events)
    if (insertError) throw insertError
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

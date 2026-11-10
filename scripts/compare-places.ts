/**
 * Compares the campus map's built-in places (app/lib/data/places.ts, what seed-places copies)
 * with the map_places table, field by field. Read-only: it reports, and changes nothing.
 *
 *   npm run places:compare
 *
 * The table is what the map shows, so a difference may be an officer's newer edit rather than
 * a mistake. Food pins come from the eateries, and hours and room directories always come from
 * code, so none of those are compared. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (to see
 * hidden rows too), so run it only on your machine.
 */
import { BUILDINGS_AND_SPACES } from '../app/lib/data/places'
import { adminClient } from './supabase-admin'

/** About 1 m; closer than this is the same spot, whatever the stored decimals */
const SAME_SPOT_DEGREES = 0.00001

const text = (v: string | null | undefined) => (v ?? '').trim()
const list = (v: readonly string[] | undefined) => [...(v ?? [])].sort().join(', ')

async function main() {
  const { data, error } = await adminClient().from('map_places').select('*').order('name')
  if (error) throw error
  const rows = data ?? []
  const seeded = new Map(rows.filter((r) => r.slug).map((r) => [r.slug!, r]))
  const inCode = new Set(BUILDINGS_AND_SPACES.map((p) => p.id))

  const missing = BUILDINGS_AND_SPACES.filter((p) => !seeded.has(p.id))
  const extra = rows.filter((r) => r.slug && !inCode.has(r.slug))
  const club = rows.filter((r) => !r.slug)
  const hidden = rows.filter((r) => r.slug && !r.published)

  let same = 0
  const different: string[] = []
  for (const p of BUILDINGS_AND_SPACES) {
    const row = seeded.get(p.id)
    if (!row) continue
    const fields: [string, string, string][] = [
      ['name', p.name, row.name],
      ['category', p.category, row.category],
      ['also in', list(p.alsoIn), list(row.also_in)],
      ['address', text(p.address), text(row.address)],
      ['description', text(p.description), text(row.description)],
      ['aliases', list(p.aliases), list(row.aliases)],
    ]
    const changes = fields.filter(([, code, table]) => code !== table)
    const moved = Math.abs(p.lat - row.lat) > SAME_SPOT_DEGREES || Math.abs(p.lng - row.lng) > SAME_SPOT_DEGREES
    if (moved) changes.push(['pin', `${p.lat}, ${p.lng}`, `${row.lat}, ${row.lng}`])
    if (!changes.length) {
      same++
      continue
    }
    different.push(`${p.id} (last changed ${row.updated_at.slice(0, 10)})`)
    for (const [field, code, table] of changes) different.push(`  ${field}\n    code:  ${code}\n    table: ${table}`)
  }

  console.log(`${BUILDINGS_AND_SPACES.length} places in code, ${rows.length} rows in map_places (${seeded.size} seeded, ${club.length} club pins)\n`)
  console.log(`Same: ${same}`)
  console.log(`\nDifferent: ${BUILDINGS_AND_SPACES.length - same - missing.length}`)
  if (different.length) console.log(different.join('\n'))
  console.log(`\nIn code, not in the table (the map won't show these): ${missing.length}`)
  for (const p of missing) console.log(`  ${p.id}`)
  console.log(`\nIn the table, not in code (no hours or rooms): ${extra.length}`)
  for (const r of extra) console.log(`  ${r.slug}: ${r.name}`)
  console.log(`\nSeeded but hidden: ${hidden.length}`)
  for (const r of hidden) console.log(`  ${r.slug}: ${r.name}`)
  console.log(`\nClub pins: ${club.length}`)
  for (const r of club) console.log(`  ${r.name} (${r.published ? 'published' : 'hidden'})`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

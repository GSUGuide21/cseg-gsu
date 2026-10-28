/**
 * Saves the Panther Express route shapes and stop locations from GSU's Passio GO live map
 * (georgiastate.passiogo.com, system 480) to app/lib/data/panther-express.json.
 *
 *   npm run map:panther-express
 *
 * Re-run when GSU changes the routes. Route names, stop order, and hours are kept by hand in
 * app/lib/data/transit.ts from GSU's published schedule (parking.gsu.edu/transportation/panther-express).
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SYSTEM = '480'
const BASE = 'https://passio3.com/www/mapGetData.php'
/** Passio route ids for the routes GSU publishes */
const ROUTES = { red: '55170', green: '44770', purple: '74405' } as const

const OUT = join(__dirname, '..', 'app', 'lib', 'data', 'panther-express.json')

type PassioStop = { id: string; name: string; latitude: number; longitude: number }
type PassioStops = {
  stops: Record<string, PassioStop>
  routePoints: Record<string, { lat: string; lng: string }[][]>
}

const round = (n: number | string) => Math.round(Number(n) * 1e6) / 1e6

async function main() {
  const res = await fetch(`${BASE}?getStops=2&wBounds=1&showBusInOos=0`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'cseg-gsu map data' },
    body: `json=${encodeURIComponent(JSON.stringify({ s0: SYSTEM, sA: 1 }))}`,
  })
  if (!res.ok) throw new Error(`Passio ${res.status}`)
  const data = (await res.json()) as PassioStops

  const shapes = Object.fromEntries(
    Object.entries(ROUTES).map(([route, id]) => {
      const points: [number, number][] = []
      for (const seg of data.routePoints[id] ?? []) {
        for (const p of seg) {
          const pt: [number, number] = [round(p.lat), round(p.lng)]
          const last = points.at(-1)
          if (!last || last[0] !== pt[0] || last[1] !== pt[1]) points.push(pt)
        }
      }
      return [route, points]
    })
  )
  const stops = Object.fromEntries(
    Object.values(data.stops).map((s) => [s.id, { name: s.name, lat: round(s.latitude), lng: round(s.longitude) }])
  )

  writeFileSync(
    OUT,
    JSON.stringify({ source: `Passio GO (GSU), ${new Date().toISOString().slice(0, 10)}`, shapes, stops }, null, 1) + '\n'
  )
  console.log(Object.entries(shapes).map(([r, p]) => `${r}: ${p.length} points`).join(', '), `· ${Object.keys(stops).length} stops`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

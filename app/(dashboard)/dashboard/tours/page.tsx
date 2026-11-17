import { listTours } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getEateries, getPublishedPlaces } from '@/lib/dashboard/public'
import { placesWithEateries } from '@/lib/data/places'

import { ToursView } from '../content/views'

export const metadata = { title: 'Tours' }

export default async function DashboardToursPage() {
  await requireOfficer()
  const [rows, { buildings, clubPlaces }, eateries] = await Promise.all([listTours(), getPublishedPlaces(), getEateries()])
  // Every place a stop can be at: the map's buildings and places to eat, and the club's own pins
  const places = [...placesWithEateries(eateries, buildings), ...clubPlaces].map((p) => ({ value: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label))
  return <ToursView rows={rows} places={places} />
}

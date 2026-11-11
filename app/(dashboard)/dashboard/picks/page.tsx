import { requireOfficer } from '@/lib/dashboard/dal'
import { getEateries, getPublishedPlaces, getResources } from '@/lib/dashboard/public'
import { listGuidePicks } from '@/lib/dashboard/queries'
import { placesWithEateries } from '@/lib/data/places'
import { pickChoices } from '@/lib/guidePicks'

import { PicksView } from './PicksView'

export const metadata = { title: 'Picks' }

export default async function DashboardPicksPage() {
  await requireOfficer()
  // What's on the site now is what a pick can hold
  const [picks, eateries, { resources }, { buildings, clubPlaces }] = await Promise.all([listGuidePicks(), getEateries(), getResources(), getPublishedPlaces()])
  const places = [...placesWithEateries(eateries, buildings), ...clubPlaces]
  const options = (guide: 'eat' | 'resources' | 'map') =>
    pickChoices(guide, { eateries, resources, places })
      .map((c) => ({ value: c.id, label: c.label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  return <PicksView picks={picks} choices={{ eat: options('eat'), resources: options('resources'), map: options('map') }} />
}

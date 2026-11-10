import type { Metadata } from 'next'

import { getConnections, getEateries, getPublishedPlaces, pageMetadata } from '@/lib/dashboard/public'
import { CampusMap } from '@/globals/CampusMap'
import { GSU_URL } from '@/globals/config/social'
import { inlineLink } from '@/globals/ui/styles'

export const generateMetadata = (): Promise<Metadata> => pageMetadata('/map')

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{
    place?: string
    room?: string
    category?: string
    tour?: string
    stop?: string
    from?: string
    to?: string
    stairs?: string
    indoor?: string
    line?: string
  }>
}) {
  const { place, room, category, tour, stop, from, to, stairs, indoor, line } = await searchParams
  // The buildings, the club's own pins, the places to eat, and the skybridges and shortcuts, from the dashboard (the
  // built-in ones, and no club pins, when Supabase isn't set up)
  const [{ buildings, clubPlaces }, eateries, connections] = await Promise.all([getPublishedPlaces(), getEateries(), getConnections()])

  return (
    <CampusMap
      initialPlaceId={place}
      initialRoom={room}
      initialCategory={category}
      initialTour={tour}
      initialStop={stop}
      initialFrom={from}
      initialTo={to}
      initialAvoidStairs={stairs === 'avoid'}
      initialPreferIndoor={indoor === 'prefer'}
      initialLine={line}
      buildings={buildings}
      extraPlaces={clubPlaces}
      eateries={eateries}
      connections={connections}
    >
      Not finding a building? Check Georgia State’s{' '}
      <a href={GSU_URL} className={inlineLink} target="_blank" rel="noopener noreferrer">
        official site
      </a>{' '}
      for the full campus map. Map data &copy; OpenStreetMap contributors; map tiles by OpenFreeMap.
    </CampusMap>
  )
}

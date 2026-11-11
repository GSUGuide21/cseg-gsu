import type { Metadata } from 'next'

import { getConnections, getEateries, getGuidePicks, getPublishedPage, getPublishedPlaces, pageMetadata } from '@/lib/dashboard/public'
import { CampusMap } from '@/globals/CampusMap'
import { GSU_URL } from '@/globals/config/social'
import { GuidePicks } from '@/globals/GuidePicks'
import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { placesWithEateries } from '@/lib/data/places'
import { picksFor } from '@/lib/guidePicks'
import { SITE_PAGES } from '@/lib/sitePages'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('map')
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/map')
  return page ? managedPageMetadata(page, meta.description) : meta
}

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
  const [{ buildings, clubPlaces }, eateries, connections, page, rows] = await Promise.all([
    getPublishedPlaces(),
    getEateries(),
    getConnections(),
    getPublishedPage('map'),
    getGuidePicks('map'),
  ])
  // Themed sets of places ("Where to study"), each a link that opens the place on the map above
  const picks = picksFor('map', rows, { places: [...placesWithEateries(eateries, buildings), ...clubPlaces] })
  const explore = <GuidePicks picks={picks} label="Explore by theme" />

  return (
    <>
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
      {/* Under the map, which keeps the screen to itself: the picks, and the page officers wrote for this address, if any */}
      {page ? (
        <ManagedPage page={page} eyebrow={SITE_PAGES.map.eyebrow} headingLevel={2} before={explore} />
      ) : picks.length ? (
        <div className={pageShell}>{explore}</div>
      ) : null}
    </>
  )
}

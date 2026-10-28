import type { Metadata } from 'next'

import { getEateries, getPublishedPlaces } from '@/lib/dashboard/public'
import { CampusMap } from '@/globals/CampusMap'
import { PageHeader } from '@/globals/Page'
import { GSU_URL } from '@/globals/config/social'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Campus Map',
  description: 'Find buildings, study spots, food, parking, and MARTA stations on Georgia State’s Atlanta campus.',
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{
    place?: string
    room?: string
    category?: string
    tour?: string
    from?: string
    to?: string
    stairs?: string
    indoor?: string
    line?: string
  }>
}) {
  const { place, room, category, tour, from, to, stairs, indoor, line } = await searchParams
  // The club's own pins and the places to eat, from the dashboard (none, and the built-in
  // eateries, when Supabase isn't set up)
  const [clubPlaces, eateries] = await Promise.all([getPublishedPlaces(), getEateries()])

  return (
    <div className={cn(pageShell, 'max-w-7xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader
        eyebrow="Campus map"
        title="Find your way around"
        lead="The buildings, study spots, food, parking, and MARTA stations you’ll use most on the Atlanta campus. Pick a place to see what’s there, or open Routes for the fastest walk to class, skybridges included."
      />
      <CampusMap
        initialPlaceId={place}
        initialRoom={room}
        initialCategory={category}
        initialTourStop={tour}
        initialFrom={from}
        initialTo={to}
        initialAvoidStairs={stairs === 'avoid'}
        initialPreferIndoor={indoor === 'prefer'}
        initialLine={line}
        extraPlaces={clubPlaces}
        eateries={eateries}
      />
      <p className="text-[0.85rem] leading-relaxed text-muted">
        Not finding a building? Check Georgia State’s{' '}
        <a href={GSU_URL} className={inlineLink} target="_blank" rel="noopener noreferrer">
          official site
        </a>{' '}
        for the full campus map. Map data &copy; OpenStreetMap contributors; map tiles by OpenFreeMap.
      </p>
    </div>
  )
}

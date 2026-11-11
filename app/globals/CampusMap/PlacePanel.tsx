import { ArrowLeft, ArrowUpRight, Route as RouteIcon } from 'lucide-react'
import { type FC, useEffect, useRef, useState } from 'react'

import { InsiderTip } from '@/globals/InsiderTip'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { PLACE_CATEGORIES, type Place } from '@/lib/data/places'
import { floorLabel, floorOf, ordinal } from '@/lib/data/rooms'
import type { OpenStatus } from '@/lib/hours'

export const categoryLabel = (p: Place) =>
  [p.category, ...(p.alsoIn ?? [])].map((c) => PLACE_CATEGORIES[c].label).join(' & ')

const directionsUrl = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`

export type PlacePanelProps = {
  place: Place
  /** Room to open the directory on and highlight */
  room?: string
  status?: OpenStatus
  /** "350 m away", once the viewer's location is known */
  away?: string
  /** Move focus here on open, when the viewer got here from the list */
  takeFocus?: boolean
  onBack: () => void
  onRoute: (id: string) => void
}

/** Side panel for a picked place: what it is, how to get there, and its rooms by floor. */
export const PlacePanel: FC<PlacePanelProps> = ({ place, room, status, away, takeFocus, onBack, onRoute }) => {
  const floors = place.floors ?? []
  const [floor, setFloor] = useState(Math.max(floorOf(floors, room), 0))
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = floors[floor]

  useEffect(() => {
    if (takeFocus) headingRef.current?.focus({ preventScroll: true })
  }, [takeFocus])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-2 py-1.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.82rem] font-semibold text-ink-soft transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <ArrowLeft size={15} aria-hidden />
          All places
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 px-4 py-4">
          <p className="text-[0.72rem] font-bold tracking-wider uppercase" style={{ color: PLACE_CATEGORIES[place.category].color }}>
            {categoryLabel(place)}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="text-[1.3rem] leading-tight font-extrabold text-ink outline-none">
            {place.name}
          </h2>
          {place.address || away ? (
            <p className="text-[0.82rem] text-muted">{[away, place.address].filter(Boolean).join(' · ')}</p>
          ) : null}
          {status ? (
            <p className={cn('text-[0.82rem] font-bold', status.open ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-muted')}>
              {status.label}
            </p>
          ) : null}
          <p className="text-[0.9rem] leading-relaxed text-ink-soft">{place.description}</p>
          {place.tip ? <InsiderTip tip={place.tip} /> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => onRoute(place.id)} className={button({ size: 'sm' })}>
              <RouteIcon size={15} aria-hidden />
              Route here
            </button>
            <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" className={button({ variant: 'outline', size: 'sm' })}>
              Google Maps
              <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
        </div>

        {shown ? (
          <section className="flex flex-col gap-2.5 border-t border-line px-4 py-4" aria-label="Rooms by floor">
            <p className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Rooms by floor</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Floor">
              {floors.map((f, i) => (
                <button
                  key={f.level}
                  type="button"
                  aria-pressed={i === floor}
                  aria-label={floorLabel(f.level)}
                  onClick={() => setFloor(i)}
                  className="cursor-pointer rounded-md border border-line px-2.5 py-1 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:border-brand/50 aria-pressed:border-brand-solid aria-pressed:bg-brand-solid aria-pressed:text-white"
                >
                  {ordinal(f.level)}
                </button>
              ))}
            </div>
            {shown.note ? <p className="text-[0.82rem] text-muted">{shown.note}</p> : null}
            {shown.rooms.length ? (
              <ul className="flex flex-col gap-0.5 text-[0.84rem] leading-snug" aria-label={floorLabel(shown.level)}>
                {shown.rooms.map((r) => (
                  <li key={r.room} className={cn('flex gap-2.5 rounded-md px-2 py-1', r.room === room && 'bg-brand-tint font-semibold')}>
                    <span className="w-11 shrink-0 text-muted tabular-nums">{r.room}</span>
                    <span className="min-w-0 flex-1 text-ink">{r.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}

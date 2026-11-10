import { ArrowLeft, ArrowRight, Lightbulb, MapPin } from 'lucide-react'
import { type FC, useEffect, useRef } from 'react'

import type { Place } from '@/lib/data/places'
import { TOURS, type Tour, type TourStop } from '@/lib/data/tour'
import { distanceLabel, distanceMeters, type LatLng } from '@/lib/geo'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import type { Route } from '@/lib/wayfinding'

export type TourPanelProps = {
  tour: Tour
  /** The tour's stops that are on the map, with their places */
  stops: readonly { stop: TourStop; place: Place }[]
  onTour: (tour: Tour) => void
  step: number
  onStep: (step: number) => void
  /** Viewer's location, for "how far to this stop" */
  position?: LatLng
  /** The walk from each stop to the next, once the walking network has loaded */
  legs?: readonly (Route | undefined)[]
  /** Open a stop in Explore, with its details and rooms */
  onOpenPlace: (id: string) => void
  /** Leave the tour from its last stop */
  onFinish: () => void
}

/** Side panel for tours: pick one, then numbered stops along a line, the current one expanded, and back/next. */
export const TourPanel: FC<TourPanelProps> = ({ tour, stops, onTour, step, onStep, position, legs, onOpenPlace, onFinish }) => {
  const last = stops.length - 1
  const walk = legs?.reduce((minutes, leg) => minutes + (leg?.minutes ?? 0), 0)
  const listRef = useRef<HTMLOListElement>(null)
  const activeRef = useRef<HTMLLIElement>(null)

  // Keep the current stop at the top of the list as the tour moves along
  useEffect(() => {
    if (listRef.current && activeRef.current) listRef.current.scrollTop = activeRef.current.offsetTop
  }, [tour, step])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a tour">
          {TOURS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === tour.id}
              aria-label={t.title}
              onClick={() => onTour(t)}
              className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink aria-pressed:border-brand-solid aria-pressed:bg-brand-solid aria-pressed:text-white"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9rem] font-bold text-ink">
            {tour.title}
            <span className="text-[0.75rem] font-semibold text-muted">
              {stops.length} stops{walk ? ` · ${walk} min walk` : ''}
            </span>
          </p>
          {step === 0 ? <p className="text-[0.8rem] leading-relaxed text-muted">{tour.intro}</p> : null}
        </div>
      </div>

      <ol ref={listRef} className="relative flex-1 overflow-y-auto">
        {stops.map(({ stop, place }, i) => {
          const active = i === step
          const away = position ? distanceLabel(distanceMeters(position, place)) : undefined
          const leg = i > 0 ? legs?.[i - 1] : undefined
          return (
            <li
              key={stop.placeId}
              ref={active ? activeRef : undefined}
              className="relative before:absolute before:inset-y-0 before:left-7.25 before:w-0.5 before:bg-line first:before:top-6 last:before:bottom-auto last:before:h-6"
            >
              <button
                type="button"
                onClick={() => onStep(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-wash',
                  'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand'
                )}
              >
                <span
                  className={cn(
                    'relative grid size-7 shrink-0 place-items-center rounded-full border-2 text-[0.8rem] font-extrabold',
                    active
                      ? 'border-[#c2410c] bg-[#c2410c] text-white'
                      : i < step
                        ? 'border-brand-solid bg-brand-solid text-white'
                        : 'border-brand bg-surface text-brand'
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[0.9rem] leading-snug font-bold text-ink">{stop.title}</span>
                  <span className="text-[0.76rem] text-muted">
                    {place.name}
                    {leg ? ` · ${leg.minutes} min walk` : ''}
                    {away ? ` · ${away} away` : ''}
                  </span>
                </span>
              </button>
              {active ? (
                <div className="flex flex-col gap-2 pr-4 pb-3 pl-14 text-[0.84rem] leading-relaxed">
                  <p className="text-ink-soft">{stop.why}</p>
                  {stop.tip ? (
                    <p className="flex items-start gap-1.5 rounded-lg bg-brand-tint px-2.5 py-1.5 text-ink-soft">
                      <Lightbulb size={14} className="mt-1 shrink-0 text-brand" aria-hidden />
                      {stop.tip}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenPlace(stop.placeId)}
                    className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[0.8rem] font-semibold text-brand hover:underline"
                  >
                    <MapPin size={13} aria-hidden />
                    See what’s here
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="border-t border-line">
        <div className="h-1 bg-fill" aria-hidden>
          <div className="h-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${((step + 1) / (last + 1)) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <button
            type="button"
            onClick={() => onStep(step - 1)}
            disabled={step === 0}
            className={button({ variant: 'outline', size: 'sm', className: 'disabled:cursor-not-allowed disabled:opacity-40' })}
          >
            <ArrowLeft size={14} aria-hidden />
            Back
          </button>
          <span className="text-[0.8rem] font-semibold text-muted" aria-live="polite">
            Stop {step + 1} of {last + 1}
          </span>
          {step === last ? (
            <button type="button" onClick={onFinish} className={button({ size: 'sm' })}>
              Finish
            </button>
          ) : (
            <button type="button" onClick={() => onStep(step + 1)} className={button({ size: 'sm' })}>
              Next
              <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

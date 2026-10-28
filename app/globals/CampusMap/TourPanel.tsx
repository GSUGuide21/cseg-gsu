import { ArrowLeft, ArrowRight, Footprints, Lightbulb } from 'lucide-react'
import type { FC } from 'react'

import { TOUR_INTRO, TOUR_STOPS, TOUR_TITLE } from '@/lib/data/tour'
import { getPlace } from '@/lib/data/places'
import { distanceLabel, distanceMeters, type LatLng } from '@/lib/geo'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export type TourPanelProps = {
  step: number
  onStep: (step: number) => void
  /** Viewer's location, for "how far to this stop" */
  position?: LatLng
}

/** Side panel for the first-week tour: numbered stops, the current one expanded, and back/next. */
export const TourPanel: FC<TourPanelProps> = ({ step, onStep, position }) => {
  const last = TOUR_STOPS.length - 1

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-1.5 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-[0.95rem] font-bold text-ink">
          <Footprints size={16} className="text-brand" aria-hidden />
          {TOUR_TITLE}
        </p>
        <p className="text-[0.8rem] leading-relaxed text-muted">{TOUR_INTRO}</p>
      </div>

      <ol className="flex-1 overflow-y-auto max-lg:max-h-112">
        {TOUR_STOPS.map((stop, i) => {
          const place = getPlace(stop.placeId)
          const active = i === step
          const away = position && place ? distanceLabel(distanceMeters(position, place)) : undefined
          return (
            <li key={stop.placeId} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onStep(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-wash',
                  'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  active && 'bg-brand-tint hover:bg-brand-tint'
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-[0.8rem] font-extrabold',
                    active ? 'bg-[#c2410c] text-white' : 'bg-brand-solid text-white'
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[0.92rem] leading-snug font-bold text-ink">{stop.title}</span>
                  <span className="text-[0.78rem] text-muted">
                    {place?.name}
                    {away ? ` · ${away}` : ''}
                  </span>
                </span>
              </button>
              {active ? (
                <div className="flex flex-col gap-2 bg-brand-tint px-4 pb-4 pl-14 text-[0.85rem] leading-relaxed">
                  <p className="text-ink-soft">{stop.why}</p>
                  {stop.tip ? (
                    <p className="flex items-start gap-1.5 text-ink-faint">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      {stop.tip}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
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
        <button
          type="button"
          onClick={() => onStep(step + 1)}
          disabled={step === last}
          className={button({ size: 'sm', className: 'disabled:cursor-not-allowed disabled:opacity-40' })}
        >
          Next
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  )
}

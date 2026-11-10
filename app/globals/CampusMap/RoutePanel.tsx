import {
  ArrowDownUp,
  Accessibility,
  ArrowUpRight,
  Bus,
  ChevronDown,
  Footprints,
  Info,
  Landmark,
  LocateFixed,
  type LucideIcon,
  Spline,
  TrafficCone,
  TrainFront,
  TrendingUp,
  Umbrella,
} from 'lucide-react'
import { type FC, type ReactNode, useId, useMemo, useState } from 'react'

import { Select } from '@/components/Form/Select'
import { cn } from '@/lib/cn'
import { PLACE_CATEGORIES, type Place, type PlaceCategory } from '@/lib/data/places'
import { MARTA_LINES, PANTHER_EXPRESS, PASSIO_GO_URL, SHUTTLE_NOTES, linesAt, type MartaLine } from '@/lib/data/transit'
import type { OpenStatus } from '@/lib/hours'
import type { ShuttlePlan } from '@/lib/shuttle'
import type { Connection, Route, RouteStep } from '@/lib/wayfinding'

/** Value of the "From" picker that means the viewer's location */
export const HERE = 'here'

/** A station on the chosen line and its walk to the destination, nearest first */
export type StationChoice = { placeId: string; route: Route }

export type RoutePanelProps = {
  /** Every place on the map, the dashboard's included, to pick from */
  places: readonly Place[]
  from: string
  to: string
  avoidStairs: boolean
  preferIndoor: boolean
  /** "Coming by MARTA": the line picked, if any */
  line?: MartaLine
  /** That line's stations near campus, by walk to the destination */
  stations: readonly StationChoice[]
  onFrom: (id: string) => void
  onTo: (id: string) => void
  onSwap: () => void
  onAvoidStairs: (avoid: boolean) => void
  onPreferIndoor: (prefer: boolean) => void
  onLine: (line?: MartaLine) => void
  /** A Panther Express ride that saves a lot of walking, if there is one */
  shuttle?: ShuttlePlan
  /** Whether each shuttle route is running now (by its weekly hours) */
  shuttleStatus: (route: ShuttlePlan['route']) => OpenStatus | undefined
  /** The map shows the shuttle trip instead of the walk */
  showShuttleTrip: boolean
  onShowShuttleTrip: (show: boolean) => void
  /** Show a skybridge or shortcut on the map */
  /** The skybridges and shortcuts routes can use */
  connections: readonly Connection[]
  onShowConnection: (id: string) => void
  route?: Route
  /** The walking network is still downloading */
  loading: boolean
  /** "My location" picked but not known yet, or too far from campus */
  locationProblem?: string
  /** The viewer's clock, for when they'd arrive; unset until after mount */
  now?: Date
  /** A place picker has focus, so its menu needs the room */
  onPicking: () => void
}

const formatMeters = (m: number) => (m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`)

const STEP_ICONS: Record<RouteStep['kind'], LucideIcon> = {
  path: Footprints,
  street: Footprints,
  crossing: TrafficCone,
  stairs: TrendingUp,
  bridge: Spline,
  covered: Umbrella,
  connection: Landmark,
}

/** A row on the steps' line; the badge sits on it */
const stepRow =
  'relative flex items-start gap-3 px-4 py-2 before:absolute before:inset-y-0 before:left-7.25 before:w-0.5 before:bg-line first:before:top-4 last:before:bottom-auto last:before:h-4'

const optionPill =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink'

const walkMs = (minutes: number) => minutes * 60_000

const clock = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** A and B, matching the route's pins on the map */
const endBadge = 'grid size-6 place-items-center rounded-full text-[0.72rem] font-extrabold text-white'

/** Places grouped by category for the pickers, A–Z within each */
const useGroupedPlaces = (places: readonly Place[]) =>
  useMemo(
    () =>
      (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).flatMap((c) => {
        const options = places
          .filter((p) => p.category === c)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ value: p.id, label: p.name }))
        return options.length ? [{ label: PLACE_CATEGORIES[c].label, options }] : []
      }),
    [places]
  )

/** Side panel for route mode: pick two places, get the fastest walk between them. */
export const RoutePanel: FC<RoutePanelProps> = ({
  places,
  from,
  to,
  avoidStairs,
  preferIndoor,
  line,
  stations,
  onFrom,
  onTo,
  onSwap,
  onAvoidStairs,
  onPreferIndoor,
  onLine,
  shuttle,
  shuttleStatus,
  showShuttleTrip,
  onShowShuttleTrip,
  connections,
  onShowConnection,
  route,
  loading,
  locationProblem,
  now,
  onPicking,
}) => {
  const id = useId()
  const [showMarta, setShowMarta] = useState(!!line)
  const groups = useGroupedPlaces(places)
  const getPlace = (placeId: string) => places.find((p) => p.id === placeId)
  const fromName = from === HERE ? 'your location' : getPlace(from)?.name
  const toPlace = getPlace(to)
  const used = route ? connections.filter((c) => route.connections.includes(c.id)) : []

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
        <div
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2"
          onFocus={(e) => {
            if (e.target instanceof HTMLInputElement) onPicking()
          }}
        >
          <span className={cn(endBadge, 'bg-[#15803d]')} aria-hidden>
            A
          </span>
          <Select
            type="combobox"
            aria-label="From"
            placeholder="Choose a starting point"
            options={[{ value: HERE, label: 'My location' }, ...groups]}
            value={from || null}
            onValueChange={(v) => onFrom(v ?? '')}
          />
          <button
            type="button"
            onClick={onSwap}
            disabled={!from && !to}
            aria-label="Swap start and destination"
            className="row-span-2 grid size-10 cursor-pointer place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDownUp size={16} aria-hidden />
          </button>
          <span className={cn(endBadge, 'bg-[#c2410c]')} aria-hidden>
            B
          </span>
          <Select
            type="combobox"
            aria-label="To"
            placeholder="Choose a destination"
            options={groups}
            value={to || null}
            onValueChange={(v) => onTo(v ?? '')}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <label className={cn(optionPill, 'has-checked:border-brand has-checked:bg-brand-tint has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-brand')}>
            <input type="checkbox" checked={avoidStairs} onChange={(e) => onAvoidStairs(e.target.checked)} className="sr-only" />
            <Accessibility size={14} aria-hidden />
            Avoid stairs
          </label>
          <label className={cn(optionPill, 'has-checked:border-brand has-checked:bg-brand-tint has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-brand')}>
            <input type="checkbox" checked={preferIndoor} onChange={(e) => onPreferIndoor(e.target.checked)} className="sr-only" />
            <Umbrella size={14} aria-hidden />
            Prefer indoors
          </label>
          <button type="button" aria-expanded={showMarta} onClick={() => setShowMarta((v) => !v)} className={cn(optionPill, 'aria-expanded:border-brand aria-expanded:text-ink')}>
            {line ? <span className="size-2.5 rounded-full" style={{ background: MARTA_LINES[line].color }} aria-hidden /> : <TrainFront size={14} aria-hidden />}
            <span id={`${id}-marta`}>By MARTA</span>
            <ChevronDown size={13} className={cn('transition-transform motion-reduce:transition-none', showMarta && 'rotate-180')} aria-hidden />
          </button>
        </div>

        {showMarta ? (
          <div className="flex flex-col gap-1.5">
            <div role="group" aria-labelledby={`${id}-marta`} className="flex flex-wrap gap-1.5">
              {(Object.keys(MARTA_LINES) as MartaLine[]).map((l) => {
                const { name, color } = MARTA_LINES[l]
                const on = line === l
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onLine(on ? undefined : l)}
                    style={on ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)` } : undefined}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink aria-pressed:text-ink"
                  >
                    <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
                    {name}
                  </button>
                )
              })}
            </div>
            {line && !to ? (
              <p className="text-[0.8rem] text-muted">Pick a destination to see which {MARTA_LINES[line].name} stop is closest.</p>
            ) : line && stations.length ? (
              <ul className="flex flex-col gap-1">
                {stations.map((s, i) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      aria-pressed={from === s.placeId}
                      onClick={() => onFrom(s.placeId)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-left transition-colors hover:border-brand/50 aria-pressed:border-brand aria-pressed:bg-brand-tint"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[0.85rem] font-bold text-ink">
                          {getPlace(s.placeId)?.name}
                          {i === 0 ? <span className="ml-1.5 text-[0.68rem] tracking-wide text-brand uppercase">Best stop</span> : null}
                        </span>
                        <span className="text-[0.72rem] text-muted">
                          {linesAt(s.placeId)
                            .map((l) => MARTA_LINES[l].name)
                            .join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.8rem] font-semibold text-ink-soft">{s.route.minutes} min walk</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div aria-live="polite">
        {locationProblem ? (
          <Notice icon={LocateFixed}>{locationProblem}</Notice>
        ) : loading && from && to ? (
          <p className="px-4 py-6 text-center text-[0.85rem] text-muted">Loading campus paths…</p>
        ) : from && to && from === to ? (
          <Notice icon={Info}>Pick two different places.</Notice>
        ) : from && to && !route ? (
          <Notice icon={Info}>
            {avoidStairs
              ? 'We couldn’t find a step-free route between these. Try turning off “Avoid stairs”.'
              : 'We couldn’t find a walking route between these.'}
          </Notice>
        ) : route && toPlace ? (
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-brand-edge bg-brand-tint px-4 py-2.5">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-[1.35rem] leading-tight font-extrabold text-ink">
                  {route.minutes} min <span className="text-[0.9rem] font-semibold text-muted">· {formatMeters(route.meters)}</span>
                </span>
                {now ? (
                  <span className="shrink-0 text-[0.8rem] font-semibold text-ink-soft">
                    Arrive {clock(new Date(now.getTime() + walkMs(route.minutes)))}
                  </span>
                ) : null}
              </p>
              {line && linesAt(from).includes(line) ? (
                <p className="text-[0.8rem] text-ink-soft">
                  Ride the {MARTA_LINES[line].name} to {fromName}, then walk to {toPlace.name}
                </p>
              ) : null}
              {used.length ? (
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {used.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onShowConnection(c.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-brand/40 bg-surface px-2.5 py-0.5 text-[0.75rem] font-semibold text-brand hover:border-brand"
                    >
                      <Landmark size={12} aria-hidden />
                      via {c.name}
                    </button>
                  ))}
                </p>
              ) : null}
            </div>

            {shuttle ? (
              <ShuttleCard
                plan={shuttle}
                status={shuttleStatus(shuttle.route)}
                showing={showShuttleTrip}
                onShow={onShowShuttleTrip}
              />
            ) : null}

            <ol className="py-1.5">
              <li className={stepRow}>
                <span className={cn(endBadge, 'relative mx-0.5 bg-[#15803d]')} aria-hidden>
                  A
                </span>
                <span className="text-[0.88rem] leading-snug font-semibold text-ink">
                  {from === HERE ? 'Start from your location' : `Start at ${fromName}`}
                </span>
              </li>
              {route.steps.map((s, i) => {
                const Icon = STEP_ICONS[s.kind]
                return (
                  <li key={i} className={stepRow}>
                    <span
                      className={cn(
                        'relative grid size-7 shrink-0 place-items-center rounded-full',
                        s.kind === 'connection' ? 'bg-brand-solid text-white' : 'border border-line bg-surface text-ink-soft'
                      )}
                      aria-hidden
                    >
                      <Icon size={14} />
                    </span>
                    <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
                      <span className="text-[0.86rem] leading-snug text-ink">{s.label}</span>
                      <span className="shrink-0 text-[0.75rem] text-muted tabular-nums">{formatMeters(s.meters)}</span>
                    </span>
                  </li>
                )
              })}
              <li className={stepRow}>
                <span className={cn(endBadge, 'relative mx-0.5 bg-[#c2410c]')} aria-hidden>
                  B
                </span>
                <span className="text-[0.88rem] leading-snug font-semibold text-ink">Arrive at {toPlace.name}</span>
              </li>
            </ol>

            <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[0.8rem] leading-relaxed text-muted">
              {used.map((c) => (
                <p key={c.id}>
                  <strong className="text-ink-soft">{c.name}:</strong> {c.note}
                </p>
              ))}
              {route.usesStairs ? <p>This route has stairs. Turn on “Avoid stairs” for a step-free one.</p> : null}
              {route.to === 'side' ? (
                <p>{toPlace.name}’s entrances aren’t mapped yet, so the route ends at the nearest side of the building.</p>
              ) : null}
              {route.from === 'side' && from !== HERE ? (
                <p>{fromName}’s entrances aren’t mapped yet, so the route starts from its nearest side.</p>
              ) : null}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${toPlace.lat},${toPlace.lng}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 self-start font-semibold text-brand no-underline hover:underline"
              >
                Open in Google Maps
                <ArrowUpRight size={13} aria-hidden />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-[0.85rem] leading-relaxed text-muted">
              Pick where you are and where you’re headed, or tap a pin on the map, for the fastest walk using skybridges and
              campus paths. Times assume an easy pace of about 80 m a minute.
            </p>
            <p className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Skybridges & shortcuts</p>
            <ul className="flex flex-col gap-2">
              {connections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onShowConnection(c.id)}
                    className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-brand/50 hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="text-[0.88rem] font-bold text-ink">{c.name}</span>
                    <span className="text-[0.78rem] leading-snug text-muted">{c.note}</span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-2 text-[0.75rem] font-bold tracking-wide text-muted uppercase">Panther Express shuttle</p>
            <ul className="flex flex-col gap-2">
              {PANTHER_EXPRESS.map((r) => {
                const status = shuttleStatus(r)
                return (
                  <li key={r.id} className="flex flex-col gap-0.5 rounded-lg border border-line px-3 py-2">
                    <span className="flex items-center gap-2 text-[0.88rem] font-bold text-ink">
                      <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
                      {r.name}
                      {status ? <StatusTag status={status} /> : null}
                    </span>
                    <span className="text-[0.78rem] leading-snug text-muted">{r.stops.map((s) => s.name).join(' → ')}</span>
                    <span className="text-[0.75rem] text-ink-faint">{r.hours}</span>
                  </li>
                )
              })}
            </ul>
            <p className="text-[0.75rem] leading-relaxed text-muted">
              {SHUTTLE_NOTES.join(' ')}{' '}
              <a href={PASSIO_GO_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand no-underline hover:underline">
                Live tracking in Passio GO ↗
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const StatusTag: FC<{ status: OpenStatus }> = ({ status }) => (
  <span className={cn('text-[0.7rem] font-bold', status.open ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-ink-faint')}>
    {status.label.replace(/^Open/, 'Running').replace(/^Closed/, 'Not running')}
  </span>
)

/** "Take the Panther Express?": walk, ride, walk, and how much walking it saves */
const ShuttleCard: FC<{ plan: ShuttlePlan; status?: OpenStatus; showing: boolean; onShow: (show: boolean) => void }> = ({
  plan,
  status,
  showing,
  onShow,
}) => (
  <div className="flex flex-col gap-1.5 border-b border-line px-4 py-3" style={{ borderLeft: `4px solid ${plan.route.color}` }}>
    <p className="flex flex-wrap items-center gap-x-2 text-[0.88rem] font-bold text-ink">
      <Bus size={15} style={{ color: plan.route.color }} aria-hidden />
      Panther Express could save {plan.saved} min of walking
    </p>
    <p className="flex flex-wrap items-center gap-x-2 text-[0.8rem] font-semibold text-ink-soft">
      {plan.route.name}
      {status ? <StatusTag status={status} /> : null}
    </p>
    <p className="text-[0.8rem] leading-relaxed text-muted">
      Walk {plan.walkTo.minutes} min to <strong className="text-ink-soft">{plan.board.name}</strong>, ride {plan.stops}{' '}
      {plan.stops === 1 ? 'stop' : 'stops'} to <strong className="text-ink-soft">{plan.alight.name}</strong>, then walk{' '}
      {plan.walkFrom.minutes} min. Add the wait for the next shuttle.
    </p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        aria-pressed={showing}
        onClick={() => onShow(!showing)}
        className="cursor-pointer p-0 text-[0.8rem] font-semibold text-brand hover:underline"
      >
        {showing ? 'Show the walk instead' : 'Show shuttle trip on map'}
      </button>
      <a
        href={PASSIO_GO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-brand no-underline hover:underline"
      >
        Live arrivals
        <ArrowUpRight size={12} aria-hidden />
      </a>
    </div>
  </div>
)

const Notice: FC<{ icon: LucideIcon; children: ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
    <Icon className="text-ink-faint" size={22} aria-hidden />
    <p className="text-[0.9rem] text-muted">{children}</p>
  </div>
)

import {
  ArrowDownUp,
  ArrowUpRight,
  Building2,
  Bus,
  Footprints,
  Info,
  Landmark,
  LocateFixed,
  type LucideIcon,
  Route as RouteIcon,
  Spline,
  TrafficCone,
  TrendingUp,
  Umbrella,
} from 'lucide-react'
import { type FC, type ReactNode, useId, useMemo } from 'react'

import { cn } from '@/lib/cn'
import { CONNECTIONS } from '@/lib/data/connections'
import { PLACE_CATEGORIES, PLACES, getPlace, type PlaceCategory } from '@/lib/data/places'
import { MARTA_LINES, PANTHER_EXPRESS, PASSIO_GO_URL, SHUTTLE_NOTES, linesAt, type MartaLine } from '@/lib/data/transit'
import type { OpenStatus } from '@/lib/hours'
import type { ShuttlePlan } from '@/lib/shuttle'
import type { Route, RouteStep } from '@/lib/wayfinding'

/** Value of the "From" picker that means the viewer's location */
export const HERE = 'here'

/** A station on the chosen line and its walk to the destination, nearest first */
export type StationChoice = { placeId: string; route: Route }

export type RoutePanelProps = {
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
  onShowConnection: (id: string) => void
  route?: Route
  /** The walking network is still downloading */
  loading: boolean
  /** "My location" picked but not known yet, or too far from campus */
  locationProblem?: string
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

const pickerLabel = 'text-[0.75rem] font-bold tracking-wide text-muted uppercase'

const selectClass =
  'h-11 w-full cursor-pointer rounded-lg border border-line bg-surface px-3 text-[0.9rem] text-ink outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/40'

/** Places grouped by category for the pickers, A–Z within each */
const useGroupedPlaces = () =>
  useMemo(
    () =>
      (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).map((c) => ({
        category: c,
        places: PLACES.filter((p) => p.category === c).sort((a, b) => a.name.localeCompare(b.name)),
      })),
    []
  )

/** Side panel for route mode: pick two places, get the fastest walk between them. */
export const RoutePanel: FC<RoutePanelProps> = ({
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
  onShowConnection,
  route,
  loading,
  locationProblem,
}) => {
  const id = useId()
  const groups = useGroupedPlaces()
  const fromName = from === HERE ? 'your location' : getPlace(from)?.name
  const toPlace = getPlace(to)
  const used = route ? CONNECTIONS.filter((c) => route.connections.includes(c.id)) : []

  const options = (
    <>
      {groups.map(({ category, places }) =>
        places.length ? (
          <optgroup key={category} label={PLACE_CATEGORIES[category].label}>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ) : null
      )}
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-[0.95rem] font-bold text-ink">
          <RouteIcon size={16} className="text-brand" aria-hidden />
          Find a route
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-from`} className={pickerLabel}>
              From
            </label>
            <select id={`${id}-from`} value={from} onChange={(e) => onFrom(e.target.value)} className={selectClass}>
              <option value="">Choose a starting point</option>
              <option value={HERE}>My location</option>
              {options}
            </select>
          </div>
          <button
            type="button"
            onClick={onSwap}
            disabled={!from && !to}
            aria-label="Swap start and destination"
            className="row-span-2 grid size-11 cursor-pointer place-items-center self-center rounded-lg border border-line text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDownUp size={17} aria-hidden />
          </button>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-to`} className={pickerLabel}>
              To
            </label>
            <select id={`${id}-to`} value={to} onChange={(e) => onTo(e.target.value)} className={selectClass}>
              <option value="">Choose a destination</option>
              {options}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-ink-soft">
            <input
              type="checkbox"
              checked={avoidStairs}
              onChange={(e) => onAvoidStairs(e.target.checked)}
              className="size-4 cursor-pointer accent-brand"
            />
            Avoid stairs
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-ink-soft">
            <input
              type="checkbox"
              checked={preferIndoor}
              onChange={(e) => onPreferIndoor(e.target.checked)}
              className="size-4 cursor-pointer accent-brand"
            />
            Prefer indoors
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <p id={`${id}-marta`} className={pickerLabel}>
            Coming by MARTA
          </p>
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
      </div>

      <div className="flex-1 overflow-y-auto max-lg:max-h-112" aria-live="polite">
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
            <div className="flex flex-col gap-1 bg-brand-tint px-4 py-3">
              <p className="text-[1.35rem] leading-tight font-extrabold text-ink">
                {route.minutes} min <span className="text-[0.95rem] font-semibold text-muted">· {formatMeters(route.meters)}</span>
              </p>
              <p className="text-[0.8rem] text-ink-soft">
                {line && linesAt(from).includes(line)
                  ? `Ride the ${MARTA_LINES[line].name} to ${fromName}, then walk to ${toPlace.name}`
                  : `From ${fromName} to ${toPlace.name}`}
              </p>
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

            <ol className="divide-y divide-line">
              {route.steps.map((s, i) => {
                const Icon = STEP_ICONS[s.kind]
                return (
                  <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <span
                      className={cn(
                        'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
                        s.kind === 'connection' ? 'bg-brand-solid text-white' : 'bg-fill text-ink-soft'
                      )}
                      aria-hidden
                    >
                      <Icon size={14} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[0.88rem] leading-snug font-semibold text-ink">{s.label}</span>
                      <span className="text-[0.75rem] text-muted">{formatMeters(s.meters)}</span>
                    </span>
                  </li>
                )
              })}
              <li className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#c2410c] text-white" aria-hidden>
                  <Building2 size={14} />
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
              Pick where you are and where you’re headed for the fastest walk, using skybridges and campus paths. Times assume
              an easy pace of about 80 m a minute.
            </p>
            <p className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Skybridges & shortcuts</p>
            <ul className="flex flex-col gap-2">
              {CONNECTIONS.map((c) => (
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

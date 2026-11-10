import { CalendarClock, CalendarDays, ExternalLink, History } from 'lucide-react'

import { Alert, Badge, Button, EmptyState } from '@/components'
import { requireOfficer } from '@/lib/dashboard/dal'
import { formatDate } from '@/lib/dashboard/format'
import { checkinCounts, listEventRows, listEvents } from '@/lib/dashboard/queries'
import type { ClubEvent } from '@/lib/data/events'
import type { ClubEventRow } from '@/lib/supabase/types'

import { DateChip, PageTitle, Panel } from '../ui'
import { AddEventButton, ClubEventMenu } from './ClubEventControls'

export const metadata = { title: 'Events' }

const EventRow = ({ event, row, count, upcoming }: { event: ClubEvent; row?: ClubEventRow; count: number; upcoming: boolean }) => (
  <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 first:pt-1 last:pb-1">
    <div className="flex min-w-0 items-center gap-3.5">
      <DateChip iso={event.start} past={!upcoming} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {event.name}
          {upcoming && Date.parse(event.start) - Date.now() < 7 * 86_400_000 ? (
            <Badge size="sm" tone="brand">
              This week
            </Badge>
          ) : null}
          {event.cancelled ? (
            <Badge size="sm" dot tone="danger">
              Cancelled
            </Badge>
          ) : null}
          {row && !row.published ? (
            <Badge size="sm" dot tone="neutral">
              Hidden
            </Badge>
          ) : null}
        </span>
        <span className="text-[0.85rem] text-muted">
          {formatDate(event.start, true)}
          {event.sessions?.length ? ` · ${event.sessions.length} times` : ''}
          {event.location ? ` · ${event.location}` : ''}
          {row ? '' : event.id.startsWith('pin-') ? ' · From PIN' : ' · Built in'}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-[0.85rem] text-ink-soft tabular-nums">
        {count} checked in
      </span>
      {event.href ? (
        <Button href={event.href} size="sm" variant="ghost" iconOnly aria-label={`${event.name} on PIN`}>
          <ExternalLink size={15} aria-hidden />
        </Button>
      ) : null}
      <Button href={`/dashboard/events/${event.id}`} size="sm" variant={upcoming ? 'primary' : 'outline'}>
        {upcoming ? 'Check people in' : 'Check-ins'}
      </Button>
      {row ? <ClubEventMenu event={row} checkins={count} /> : null}
    </div>
  </li>
)

export default async function EventsPage() {
  await requireOfficer()
  // No table until the events migration is applied
  const [{ upcoming, past }, counts, rows] = await Promise.all([listEvents(), checkinCounts(), listEventRows().catch(() => null)])
  const rowOf = new Map((rows ?? []).map((r) => [r.slug, r]))
  return (
    <>
      <PageTitle
        icon={<CalendarDays />}
        title="Events"
        description="Events on PIN as Public show here on their own; add the club’s others here. Check people in at the door to track attendance."
        actions={
          <>
            <Button href="https://pin.gsu.edu/organization/cseg" size="sm" variant="outline">
              Manage on PIN
            </Button>
            <AddEventButton disabled={rows === null} />
          </>
        }
      />
      <div className="flex flex-col gap-6">
        {rows === null ? (
          <Alert tone="warning" title="The events table isn’t set up yet">
            Run the events migration in Supabase (supabase/migrations/20261102120000_events_executives.sql) to add events here. Until then, the site shows its built-in past events.
          </Alert>
        ) : rows.length === 0 ? (
          <Alert tone="info" title="These past events are built into the site">
            Run npm run events:seed -- --write to copy them here, where you can edit them. Their check-ins stay with them.
          </Alert>
        ) : null}
        <Panel title="Upcoming" icon={<CalendarClock />}>
          {upcoming.length ? (
            <ul className="m-0 list-none divide-y divide-line p-0">
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} row={rowOf.get(e.id)} count={counts.get(e.id) ?? 0} upcoming />
              ))}
            </ul>
          ) : (
            <EmptyState size="sm" icon={<CalendarDays />} title="Nothing coming up" description="Events on PIN as Public show up here, and so do ones you add." />
          )}
        </Panel>
        {past.length ? (
          <Panel title="Past" icon={<History />}>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {past.map((e) => (
                <EventRow key={e.id} event={e} row={rowOf.get(e.id)} count={counts.get(e.id) ?? 0} upcoming={false} />
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </>
  )
}

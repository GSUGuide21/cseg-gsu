import { CalendarDays, ExternalLink } from 'lucide-react'

import { Badge, Button, EmptyState } from '@/components'
import { requireOfficer } from '@/lib/dashboard/dal'
import { formatDate } from '@/lib/dashboard/format'
import { checkinCounts, listEvents } from '@/lib/dashboard/queries'
import type { ClubEvent } from '@/lib/data/events'

import { PageTitle } from '../ui'

export const metadata = { title: 'Events' }

const EventRow = ({ event, count, upcoming }: { event: ClubEvent; count: number; upcoming: boolean }) => (
  <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
        {event.name}
        {upcoming && Date.parse(event.start) - Date.now() < 7 * 86_400_000 ? (
          <Badge size="sm" tone="brand">
            This week
          </Badge>
        ) : null}
      </span>
      <span className="text-[0.85rem] text-muted">
        {formatDate(event.start, true)}
        {event.location ? ` · ${event.location}` : ''}
      </span>
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
    </div>
  </li>
)

export default async function EventsPage() {
  await requireOfficer()
  const [{ upcoming, past }, counts] = await Promise.all([listEvents(), checkinCounts()])
  return (
    <>
      <PageTitle
        title="Events"
        description="Events come from PIN; publish them there as Public to see them here. Check people in at the door to track attendance."
        actions={
          <Button href="https://pin.gsu.edu/organization/cseg" size="sm" variant="outline">
            Manage on PIN
          </Button>
        }
      />
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-1">
          <h2 className="m-0 text-[1rem] font-bold text-ink">Upcoming</h2>
          {upcoming.length ? (
            <ul className="m-0 list-none divide-y divide-line p-0">
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} count={counts.get(e.id) ?? 0} upcoming />
              ))}
            </ul>
          ) : (
            <EmptyState bordered size="sm" icon={<CalendarDays />} title="No upcoming events on PIN" description="Only events whose visibility is Public show up here." />
          )}
        </section>
        <section className="flex flex-col gap-1">
          <h2 className="m-0 text-[1rem] font-bold text-ink">Past</h2>
          <ul className="m-0 list-none divide-y divide-line p-0">
            {past.map((e) => (
              <EventRow key={e.id} event={e} count={counts.get(e.id) ?? 0} upcoming={false} />
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

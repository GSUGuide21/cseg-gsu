import { CalendarDays, ChevronRight, CircleCheck, History, Newspaper, Repeat, TriangleAlert, UserCheck, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { BarChart, Button, EmptyState, LineChart, Stat, StatGroup, Timeline, type TimelineItem } from '@/components'
import { cn } from '@/lib/cn'
import { requireOfficer } from '@/lib/dashboard/dal'
import { daysAway, formatDate, formatToday, lastMonths, monthKey, partOfDay } from '@/lib/dashboard/format'
import { engagement, LAPSED_DAYS, needsAttention, type AttentionItem, type Engagement } from '@/lib/dashboard/overview'
import { getOverview } from '@/lib/dashboard/queries'
import { atlantaToday } from '@/lib/eateries'
import type { ClubEvent } from '@/lib/data/events'

import { DateChip, Panel } from './ui'

export const metadata = { title: 'Overview' }

const DAY = 86_400_000

/** The tiles come in one after another */
const ENTER = ['[animation-delay:0ms]', '[animation-delay:70ms]', '[animation-delay:140ms]', '[animation-delay:210ms]'].map((d) => `motion-safe:animate-fade-in ${d}`)

/** The top of the page: a greeting on Georgia State blue (the same in both themes), and the next event */
const Hero: FC<{ name: string; next?: ClubEvent; now: number }> = ({ name, next, now }) => (
  <section className="relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-brand-solid from-55% to-brand-bright p-6 text-white shadow-card sm:p-8">
    <span aria-hidden className="absolute -top-28 -right-20 -z-10 size-80 rounded-full bg-white/15 blur-3xl" />
    <span
      aria-hidden
      className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.2)_1px,transparent_1px)] mask-[linear-gradient(to_left,black,transparent_65%)] bg-size-[18px_18px]"
    />
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="m-0 text-[0.8rem] font-bold tracking-wider uppercase">{formatToday(new Date(now))}</p>
        <h1 className="m-0 text-[clamp(1.7rem,4vw,2.4rem)] leading-tight font-extrabold tracking-tight">
          Good {partOfDay(new Date(now))}, {name}
        </h1>
        <p className="m-0 max-w-xl text-[0.95rem]">How the club is doing, what’s coming up, and what officers changed lately.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            href="/dashboard/posts/new"
            size="sm"
            leading={<Newspaper size={15} aria-hidden />}
            className="bg-white text-brand-solid hover:bg-white/90 focus-visible:outline-white"
          >
            Write a post
          </Button>
          <Button
            href="/dashboard/members?add=1"
            size="sm"
            variant="outline"
            leading={<UserPlus size={15} aria-hidden />}
            className="border-white/60 text-white hover:border-white hover:bg-white/15 focus-visible:outline-white"
          >
            Add member
          </Button>
        </div>
      </div>
      {next ? (
        <Link
          href={`/dashboard/events/${next.id}`}
          className="flex w-full max-w-sm min-w-0 items-center gap-3.5 rounded-xl border border-white/30 bg-white/10 p-4 text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
        >
          <DateChip iso={next.start} />
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.72rem] font-bold tracking-wider uppercase">Next up</span>
            <span className="truncate font-bold">{next.name}</span>
            <span className="text-[0.85rem]">{Date.parse(next.start) > now ? `Starts ${daysAway(next.start, new Date(now))}` : 'Happening now'}</span>
          </span>
        </Link>
      ) : null}
    </div>
  </section>
)

const TONE_DOT: Record<AttentionItem['tone'], string> = { brand: 'bg-brand', warning: 'bg-warning', info: 'bg-muted' }

/** What wants an officer: unread messages, drafts waiting or forgotten, eatery hours to check */
const NeedsAttention: FC<{ items: AttentionItem[] }> = ({ items }) => (
  <Panel title="Needs attention" icon={<TriangleAlert />}>
    {items.length ? (
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-ink no-underline transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE_DOT[item.tone])} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{item.title}</span>
                {item.detail ? <span className="truncate text-[0.85rem] text-muted">{item.detail}</span> : null}
              </span>
              <ChevronRight aria-hidden size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="m-0 flex items-center gap-2 text-[0.9rem] text-muted">
        <CircleCheck aria-hidden size={16} className="text-success" />
        All caught up: no unread messages, nothing waiting for review, and every eatery’s hours are current.
      </p>
    )}
  </Panel>
)

/** Whether members come back: returning attendees, who's drifted off, and the busiest events */
const ComingBack: FC<{ data: Engagement }> = ({ data: { attendees, returning, lapsed, topEvents } }) => (
  <Panel
    title="Coming back"
    icon={<Repeat />}
    action={
      <Link href="/dashboard/members" className="text-[0.85rem] font-semibold text-brand hover:underline">
        Members
      </Link>
    }
  >
    {attendees ? (
      <p className="m-0 text-[0.95rem] text-ink">
        <span className="text-[1.6rem] font-extrabold tabular-nums">{Math.round((returning / attendees) * 100)}%</span>{' '}
        <span className="text-muted">
          of members who’ve checked in came to two or more events ({returning} of {attendees}).
        </span>
      </p>
    ) : (
      <p className="m-0 text-[0.9rem] text-muted">Once members are checked in at events, how many come back shows here.</p>
    )}
    {lapsed.length ? (
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-[0.8rem] font-bold tracking-wide text-muted uppercase">
          Active, but not seen in {LAPSED_DAYS} days ({lapsed.length})
        </h3>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {lapsed.slice(0, 8).map((m) => (
            <li key={m.id}>
              <Link
                href={`/dashboard/members/${m.id}`}
                title={m.lastSeen ? `Last checked in ${formatDate(m.lastSeen)}` : 'Never checked in'}
                className="inline-flex rounded-full border border-line px-2.5 py-0.5 text-[0.85rem] text-ink no-underline hover:border-brand/50 hover:bg-brand-wash"
              >
                {m.name}
              </Link>
            </li>
          ))}
          {lapsed.length > 8 ? <li className="self-center text-[0.85rem] text-muted">and {lapsed.length - 8} more</li> : null}
        </ul>
      </div>
    ) : null}
    {topEvents.length ? (
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-[0.8rem] font-bold tracking-wide text-muted uppercase">Busiest events, last 6 months</h3>
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {topEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-[0.9rem]">
              <Link href={`/dashboard/events/${e.id}`} className="min-w-0 flex-1 truncate text-ink no-underline hover:underline">
                {e.name}
              </Link>
              <span className="shrink-0 font-semibold text-muted tabular-nums">{e.count}</span>
            </li>
          ))}
        </ol>
      </div>
    ) : null}
  </Panel>
)

export default async function OverviewPage() {
  const { officer } = await requireOfficer()
  const { members, checkins, posts, pages, activity, upcoming, eateries, closures, unread } = await getOverview()
  const now = Date.now()
  const attention = needsAttention({ unread, posts, pages, eateries, closures, now, today: atlantaToday(new Date(now)) })
  const comingBack = engagement({ members, checkins, now })

  const active = members.filter((m) => m.status === 'active').length
  const newThisMonth = members.filter((m) => m.joined_on.slice(0, 7) === monthKey(new Date(now).toISOString())).length
  const recentCheckins = checkins.filter((c) => now - Date.parse(c.checked_in_at) < 30 * DAY).length
  const priorCheckins = checkins.filter((c) => {
    const age = now - Date.parse(c.checked_in_at)
    return age >= 30 * DAY && age < 60 * DAY
  }).length
  const published = posts.filter((p) => p.status === 'published').length
  const drafts = posts.length - published

  const months = lastMonths(6, new Date(now))
  const byMonth = (keys: string[]) => months.map((m) => keys.filter((k) => k === m.key).length)
  const checkinSeries = byMonth(checkins.map((c) => monthKey(c.checked_in_at)))
  const joinedSeries = byMonth(members.map((m) => m.joined_on.slice(0, 7)))

  const feed: TimelineItem[] = activity.map((a) => ({
    id: String(a.id),
    avatar: { name: a.actor_email.split('@')[0] },
    title: (
      <>
        <span className="font-semibold">{a.actor_email.split('@')[0]}</span> {a.action}
        {a.subject ? <> {a.subject}</> : null}
      </>
    ),
    time: a.created_at,
  }))

  return (
    <div className="flex flex-col gap-6">
      <Hero name={(officer.name ?? officer.email).split(' ')[0]} next={upcoming[0]} now={now} />

      <StatGroup>
        <Stat label="Members" value={members.length} icon={<Users />} description={`${newThisMonth} joined this month`} href="/dashboard/members" className={ENTER[0]} />
        <Stat
          label="Active members"
          value={members.length ? `${Math.round((active / members.length) * 100)}%` : '—'}
          icon={<UserCheck />}
          tone="success"
          description={`${active} of ${members.length}`}
          href="/dashboard/members"
          className={ENTER[1]}
        />
        <Stat
          label="Check-ins, last 30 days"
          value={recentCheckins}
          icon={<CalendarDays />}
          tone="warning"
          delta={priorCheckins ? { value: Math.round(((recentCheckins - priorCheckins) / priorCheckins) * 100), period: 'vs the 30 days before' } : undefined}
          trend={checkinSeries}
          trendLabel="last 6 months"
          href="/dashboard/events"
          className={ENTER[2]}
        />
        <Stat label="Published posts" value={published} icon={<Newspaper />} tone="info" description={`${drafts} ${drafts === 1 ? 'draft' : 'drafts'}`} href="/dashboard/posts" className={ENTER[3]} />
      </StatGroup>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <NeedsAttention items={attention} />
        <ComingBack data={comingBack} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <LineChart
            title="Check-ins"
            description="By month, at events officers checked people into"
            x="month"
            series={[{ key: 'n', name: 'Check-ins' }]}
            data={months.map((m, i) => ({ month: m.label, n: checkinSeries[i] }))}
            area
          />
        </Panel>
        <Panel>
          <BarChart title="New members" description="By the month they joined" x="month" series={[{ key: 'n', name: 'Joined' }]} data={months.map((m, i) => ({ month: m.label, n: joinedSeries[i] }))} />
        </Panel>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel
          title="Coming up"
          icon={<CalendarDays />}
          action={
            <Link href="/dashboard/events" className="text-[0.85rem] font-semibold text-brand hover:underline">
              All events
            </Link>
          }
        >
          {upcoming.length ? (
            <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {upcoming.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center gap-3.5 py-3">
                  <DateChip iso={e.start} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-ink">{e.name}</span>
                    <span className="text-[0.85rem] text-muted">
                      {formatDate(e.start, true)}
                      {e.location ? ` · ${e.location}` : ''}
                    </span>
                  </div>
                  <Button href={`/dashboard/events/${e.id}`} size="sm" variant="outline">
                    Check in
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              size="sm"
              icon={<CalendarDays />}
              title="Nothing coming up"
              description="Events added under Events, and public ones posted on PIN, show up here."
              actions={
                <Button href="/dashboard/events" size="sm" variant="outline">
                  Add an event
                </Button>
              }
            />
          )}
        </Panel>
        <Panel title="Recent activity" icon={<History />}>
          {feed.length ? <Timeline aria-label="Recent activity" items={feed} /> : <p className="m-0 text-[0.9rem] text-muted">Changes officers make show up here.</p>}
        </Panel>
      </div>
    </div>
  )
}

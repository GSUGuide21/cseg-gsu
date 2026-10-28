import { CalendarDays, Newspaper, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'

import { BarChart, Button, EmptyState, LineChart, Stat, StatGroup, Timeline, type TimelineItem } from '@/components'
import { requireOfficer } from '@/lib/dashboard/dal'
import { formatDate, lastMonths, monthKey } from '@/lib/dashboard/format'
import { getOverview } from '@/lib/dashboard/queries'

import { PageTitle } from './ui'

export const metadata = { title: 'Overview' }

const DAY = 86_400_000

export default async function OverviewPage() {
  const { officer } = await requireOfficer()
  const { members, checkins, posts, activity, upcoming } = await getOverview()
  const now = Date.now()

  const active = members.filter((m) => m.status === 'active').length
  const newThisMonth = members.filter((m) => m.joined_on.slice(0, 7) === monthKey(new Date(now).toISOString())).length
  const recentCheckins = checkins.filter((c) => now - Date.parse(c.checked_in_at) < 30 * DAY).length
  const priorCheckins = checkins.filter((c) => {
    const age = now - Date.parse(c.checked_in_at)
    return age >= 30 * DAY && age < 60 * DAY
  }).length
  const published = posts.filter((p) => p.status === 'published').length

  const months = lastMonths(6, new Date(now))
  const byMonth = (keys: string[]) => months.map((m) => keys.filter((k) => k === m.key).length)
  const checkinSeries = byMonth(checkins.map((c) => monthKey(c.checked_in_at)))
  const joinedSeries = byMonth(members.map((m) => m.joined_on.slice(0, 7)))

  const feed: TimelineItem[] = activity.map((a) => ({
    id: String(a.id),
    title: (
      <>
        <span className="font-semibold">{a.actor_email.split('@')[0]}</span> {a.action}
        {a.subject ? <> {a.subject}</> : null}
      </>
    ),
    time: a.created_at,
  }))

  return (
    <>
      <PageTitle
        title={`Hi, ${(officer.name ?? officer.email).split(' ')[0]}`}
        description="How the club is doing, what’s coming up, and what officers changed lately."
        actions={
          <>
            <Button href="/dashboard/members?add=1" variant="outline" size="sm" leading={<UserPlus size={15} aria-hidden />}>
              Add member
            </Button>
            <Button href="/dashboard/posts/new" size="sm" leading={<Newspaper size={15} aria-hidden />}>
              Write a post
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <StatGroup>
          <Stat label="Members" value={members.length} icon={<Users />} description={`${newThisMonth} joined this month`} href="/dashboard/members" />
          <Stat label="Active members" value={members.length ? `${Math.round((active / members.length) * 100)}%` : '—'} description={`${active} of ${members.length}`} />
          <Stat
            label="Check-ins, last 30 days"
            value={recentCheckins}
            icon={<CalendarDays />}
            delta={priorCheckins ? { value: Math.round(((recentCheckins - priorCheckins) / priorCheckins) * 100), period: 'vs the 30 days before' } : undefined}
            trend={checkinSeries}
            trendLabel="last 6 months"
            href="/dashboard/events"
          />
          <Stat label="Published posts" value={published} icon={<Newspaper />} description={`${posts.length - published} drafts`} href="/dashboard/posts" />
        </StatGroup>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-line p-5">
            <LineChart
              title="Check-ins"
              description="By month, at events officers checked people into"
              x="month"
              series={[{ key: 'n', name: 'Check-ins' }]}
              data={months.map((m, i) => ({ month: m.label, n: checkinSeries[i] }))}
              area
            />
          </section>
          <section className="rounded-xl border border-line p-5">
            <BarChart title="New members" description="By the month they joined" x="month" series={[{ key: 'n', name: 'Joined' }]} data={months.map((m, i) => ({ month: m.label, n: joinedSeries[i] }))} />
          </section>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-[1rem] font-bold text-ink">Coming up</h2>
              <Link href="/dashboard/events" className="text-[0.85rem] font-semibold text-brand hover:underline">
                All events
              </Link>
            </div>
            {upcoming.length ? (
              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {upcoming.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold text-ink">{e.name}</span>
                      <span className="text-[0.85rem] text-muted">
                        {formatDate(e.start, true)}
                        {e.location ? ` · ${e.location}` : ''}
                      </span>
                    </div>
                    <Button href={`/dashboard/events/${e.id}`} size="sm" variant="outline">
                      Check-in
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState size="sm" icon={<CalendarDays />} title="Nothing on PIN yet" description="Public events posted on PIN show up here." />
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
            <h2 className="m-0 text-[1rem] font-bold text-ink">Recent activity</h2>
            {feed.length ? <Timeline aria-label="Recent activity" items={feed} /> : <p className="m-0 text-[0.9rem] text-muted">Changes officers make show up here.</p>}
          </section>
        </div>
      </div>
    </>
  )
}

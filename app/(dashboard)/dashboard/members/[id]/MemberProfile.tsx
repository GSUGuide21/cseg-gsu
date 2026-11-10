'use client'

import { CalendarCheck, CalendarDays, Clock, History, Pencil, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { Alert, Avatar, Badge, Breadcrumb, Button, DescriptionList, EmptyState, Stat, StatGroup } from '@/components'
import { setMemberStatus } from '@/lib/dashboard/actions'
import { QUIET_DAYS, attendanceByMember, isQuiet } from '@/lib/dashboard/attendance'
import { formatDate, lastMonths, monthKey } from '@/lib/dashboard/format'
import type { MemberRow } from '@/lib/supabase/types'

import { DateChip, Panel, useAction } from '../../ui'
import { MemberDialog, STATUS } from '../MembersView'

/** One check-in, with its event's name if it's known */
export interface MemberCheckin {
  id: string
  eventId: string
  eventName: string | null
  /** Whether the event still has a page here (PIN drops events once they end) */
  linked: boolean
  checkedInAt: string
}

/** One member: how much they come to events, and what officers know about them */
export const MemberProfile: FC<{ member: MemberRow; history: MemberCheckin[] }> = ({ member, history }) => {
  const router = useRouter()
  const { pending, run } = useAction()
  const [editing, setEditing] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)

  const attended = attendanceByMember(history.map((c) => ({ member_id: member.id, event_id: c.eventId, checked_in_at: c.checkedInAt })))[member.id]
  const months = lastMonths(6)
  const trend = months.map((m) => new Set(history.filter((c) => monthKey(c.checkedInAt) === m.key).map((c) => c.eventId)).size)
  const quiet = member.status === 'active' && isQuiet(attended?.lastSeen ?? null, member.joined_on)

  return (
    <>
      <Breadcrumb items={[{ label: 'Members', href: '/dashboard/members' }, { label: member.name }]} className="mb-3" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={member.name} size="xl" decorative />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink">
              {member.name}
              <Badge size="sm" dot tone={STATUS[member.status].tone}>
                {STATUS[member.status].word}
              </Badge>
            </h1>
            <p className="m-0 text-[0.92rem] text-muted">{[member.major, member.year].filter(Boolean).join(' · ') || 'No major or year yet'}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          leading={<Pencil size={15} aria-hidden />}
          onClick={() => {
            setDialogKey((k) => k + 1)
            setEditing(true)
          }}
        >
          Edit
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {quiet ? (
          <Alert
            tone="warning"
            title={`No check-ins in ${QUIET_DAYS} days`}
            actions={
              <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => setMemberStatus([member.id], 'inactive'), () => router.refresh())}>
                Mark inactive
              </Button>
            }
          >
            They’re marked active, but haven’t been checked in to an event lately.
          </Alert>
        ) : null}

        <StatGroup>
          <Stat label="Events attended" value={attended?.events ?? 0} icon={<CalendarCheck />} trend={trend} trendLabel="last 6 months" />
          <Stat label="Last seen" value={attended?.lastSeen ? formatDate(attended.lastSeen) : 'Not yet'} icon={<Clock />} tone="info" />
          <Stat label="Joined" value={formatDate(member.joined_on)} icon={<UserRound />} tone="success" />
        </StatGroup>

        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <Panel title="Attendance" icon={<History />}>
            {history.length ? (
              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {history.map((c) => {
                  const name = c.eventName ?? 'An event'
                  return (
                    <li key={c.id} className="flex items-center gap-3.5 py-3">
                      <DateChip iso={c.checkedInAt} past />
                      <div className="flex min-w-0 flex-col">
                        {c.linked ? (
                          <Link href={`/dashboard/events/${c.eventId}`} className="font-semibold text-ink no-underline hover:text-brand hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink">{name}</span>
                        )}
                        <span className="text-[0.85rem] text-muted">Checked in {formatDate(c.checkedInAt, true)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState size="sm" icon={<CalendarDays />} title="No check-ins yet" description="Events they’re checked in to show up here." />
            )}
          </Panel>
          <Panel title="Details" icon={<UserRound />}>
            <DescriptionList
              layout="stacked"
              items={[
                { term: 'Email', details: member.email ? <a href={`mailto:${member.email}`} className="text-brand hover:underline">{member.email}</a> : '—' },
                { term: 'Major', details: member.major ?? '—' },
                { term: 'Year', details: member.year ?? '—' },
                { term: 'Notes', details: member.notes ? <span className="whitespace-pre-line">{member.notes}</span> : '—' },
              ]}
            />
          </Panel>
        </div>
      </div>
      <MemberDialog key={dialogKey} member={member} open={editing} onClose={() => setEditing(false)} />
    </>
  )
}

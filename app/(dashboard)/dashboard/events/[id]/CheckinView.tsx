'use client'

import { Download, Undo2, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FC } from 'react'

import { Badge, Button, EmptyState, Stat, Table } from '@/components'
import { Field, Input, Select } from '@/components/Form'
import { checkIn, undoCheckIn } from '@/lib/dashboard/actions'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/dashboard/format'
import type { CheckinRow, EventRsvpRow, MemberRow } from '@/lib/supabase/types'

import { useAction } from '../../ui'

type MemberOption = Pick<MemberRow, 'id' | 'name' | 'email'>

/**
 * Check people in at the door: pick a member (type to search), or type a guest's name.
 * The form clears after each one, ready for the next person in line. People who RSVP'd on
 * the site are listed until they arrive, each a tap to check in. With guests turned off in
 * Settings, only members can be checked in.
 */
export const CheckinView: FC<{ eventId: string; checkins: CheckinRow[]; members: MemberOption[]; rsvps?: EventRsvpRow[]; walkinsAllowed?: boolean }> = ({
  eventId,
  checkins,
  members,
  rsvps = [],
  walkinsAllowed = true,
}) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [memberId, setMemberId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const nameRef = useRef<HTMLDivElement>(null)
  const member = members.find((m) => m.id === memberId)
  const checkedIn = new Set(checkins.map((c) => c.member_id).filter(Boolean))
  const fromMembers = checkins.filter((c) => c.member_id).length
  // Who said they'd come and hasn't yet, matched to check-ins by email
  const arrived = new Set(checkins.map((c) => c.email?.toLowerCase()).filter(Boolean))
  const expected = rsvps.filter((r) => !arrived.has(r.email.toLowerCase()))
  const checkInRsvp = (r: EventRsvpRow) => {
    const known = members.find((m) => m.email?.toLowerCase() === r.email.toLowerCase())
    const data = new FormData()
    data.set('event_id', eventId)
    data.set('name', known?.name ?? r.name)
    data.set('email', r.email)
    if (known) data.set('member_id', known.id)
    run(() => checkIn(data), () => router.refresh())
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
        <h2 className="m-0 text-[1rem] font-bold text-ink">Check someone in</h2>
        <form
          key={formKey}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            data.set('event_id', eventId)
            if (member) {
              data.set('name', member.name)
              data.set('email', member.email ?? '')
              data.set('member_id', member.id)
            }
            run(() => checkIn(data), () => {
              setMemberId(null)
              setFormKey((k) => k + 1)
              router.refresh()
              // Ready for the next person
              requestAnimationFrame(() => nameRef.current?.querySelector<HTMLElement>('input, button')?.focus())
            })
          }}
        >
          <div ref={nameRef}>
            <Field label="Member" description={walkinsAllowed ? 'Type to search. Leave empty for a guest.' : 'Type to search. Guests are turned off in Settings.'}>
              <Select
                type="combobox"
                placeholder="Search members"
                value={memberId}
                onValueChange={setMemberId}
                options={members.map((m) => ({ value: m.id, label: m.name, description: checkedIn.has(m.id) ? 'Already checked in' : (m.email ?? undefined), disabled: checkedIn.has(m.id) }))}
              />
            </Field>
          </div>
          {member || !walkinsAllowed ? null : (
            <>
              <Field label="Guest name" error={errors.name}>
                <Input name="name" autoComplete="off" />
              </Field>
              <Field label="Guest email" error={errors.email} description="Optional; lets you add them as a member later.">
                <Input name="email" type="email" autoComplete="off" />
              </Field>
            </>
          )}
          <Button type="submit" loading={pending} disabled={!member && !walkinsAllowed} leading={<UserCheck size={16} aria-hidden />}>
            Check in {member ? member.name.split(' ')[0] : ''}
          </Button>
        </form>
        {rsvps.length ? (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <h3 className="m-0 text-[0.9rem] font-bold text-ink">
              RSVP’d, not here yet <Badge size="sm">{expected.length}</Badge>
            </h3>
            {expected.length ? (
              <ul aria-label="RSVP’d, not here yet" className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {expected.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[0.9rem] font-semibold text-ink">{r.name}</span>
                      <span className="truncate text-[0.8rem] text-muted">{r.email}</span>
                    </span>
                    <Button size="sm" variant="outline" aria-label={`Check in ${r.name}`} disabled={pending} onClick={() => checkInRsvp(r)}>
                      Check in
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[0.85rem] text-muted">Everyone who RSVP’d is here.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <div className={rsvps.length ? 'grid grid-cols-2 gap-4 sm:grid-cols-3' : 'grid grid-cols-2 gap-4'}>
          <Stat label="Checked in" value={checkins.length} />
          <Stat label="Members" value={fromMembers} description={`${checkins.length - fromMembers} guests`} />
          {rsvps.length ? <Stat label="RSVPs" value={rsvps.length} description={`${rsvps.length - expected.length} came`} /> : null}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="self-end"
          leading={<Download size={15} aria-hidden />}
          disabled={!checkins.length}
          onClick={() =>
            downloadCsv(
              `cseg-checkins-${eventId}`,
              ['Name', 'Email', 'Member or guest', 'Checked in at'],
              checkins.map((c) => [c.name, c.email, c.member_id ? 'Member' : 'Guest', c.checked_in_at])
            )
          }
        >
          Export CSV
        </Button>
        <Table
          caption="Checked in"
          rows={checkins}
          getRowId={(c) => c.id}
          density="compact"
          defaultSort={{ key: 'checked_in_at', direction: 'descending' }}
          empty={<EmptyState size="sm" icon={<UserCheck />} title="Nobody yet" description="People you check in show up here, newest first." />}
          columns={[
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              cell: (c) => (
                <span className="flex flex-wrap items-center gap-2">
                  {c.name}
                  {c.member_id ? null : (
                    <Badge size="sm" appearance="outline">
                      Guest
                    </Badge>
                  )}
                </span>
              ),
            },
            { key: 'email', header: 'Email', hideWhenStacked: true },
            { key: 'checked_in_at', header: 'Time', sortable: true, cell: (c) => formatDate(c.checked_in_at, true) },
          ]}
          rowActions={(c) => (
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              aria-label={`Undo ${c.name}’s check-in`}
              onClick={() => run(() => undoCheckIn(c.id), () => router.refresh())}
            >
              <Undo2 size={15} aria-hidden />
            </Button>
          )}
        />
      </section>
    </div>
  )
}

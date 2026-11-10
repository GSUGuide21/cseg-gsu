'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FC } from 'react'

import { ActionMenu, Button, Dialog, useNotify } from '@/components'
import { DateTimePicker, Field, Input, SegmentedControl, Switch, TagInput, TextArea } from '@/components/Form'
import { deleteEvent, saveEvent } from '@/lib/dashboard/actions'
import { atlantaToIso, isoToAtlanta } from '@/lib/dashboard/format'
import { EVENT_SESSIONS_MAX } from '@/lib/dashboard/validate'
import type { ClubEventRow } from '@/lib/supabase/types'

import { ImageField } from '../ImageField'
import { useAction } from '../ui'

type SessionDraft = { key: number; start: string | null; end: string | null; location: string }

/** The event's sessions as the form edits them: each time and place, on Atlanta's clock */
const draftsFrom = (event: ClubEventRow | null): SessionDraft[] => {
  const list = event?.sessions?.length ? event.sessions : event ? [{ start: event.starts_at, end: event.ends_at, location: event.location }] : [{ start: '', end: '', location: '' }]
  return list.map((s, key) => ({ key, start: isoToAtlanta(s.start), end: isoToAtlanta(s.end), location: s.location ?? '' }))
}

/**
 * When and where: one row per time it meets (a workshop series, or the same talk in two
 * rooms), each with its own start, end, and place. Sent with the form as one JSON field.
 */
const SessionsField: FC<{ initial: SessionDraft[]; errors: Record<string, string> }> = ({ initial, errors }) => {
  const [rows, setRows] = useState(initial)
  const nextKey = useRef(initial.length)
  const update = (key: number, patch: Partial<SessionDraft>) => setRows((r) => r.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const add = () =>
    setRows((r) => {
      // A new time starts as the last one's place, a week on: the usual next session
      const last = r.at(-1)
      const weekOn = (local: string | null) => (local ? isoToAtlanta(new Date(Date.parse(atlantaToIso(local) ?? '') + 7 * 86_400_000).toISOString()) : null)
      return [...r, { key: nextKey.current++, start: weekOn(last?.start ?? null), end: weekOn(last?.end ?? null), location: last?.location ?? '' }]
    })
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 text-[0.9rem] font-semibold text-ink">When and where</legend>
      <p className="m-0 text-[0.8rem] text-muted">
        Times are Atlanta time. A building and room, like Student Center West 460, links to the campus map. Add a row for each time it meets.
      </p>
      {errors.sessions ? (
        <p role="alert" className="m-0 text-[0.8rem] font-semibold text-danger">
          {errors.sessions}
        </p>
      ) : null}
      <input type="hidden" name="sessions" value={JSON.stringify(rows.map(({ start, end, location }) => ({ start, end, location })))} />
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((s, i) => (
          <li key={s.key} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label={rows.length > 1 ? `Time ${i + 1}: starts` : 'Starts'} required error={errors[`sessions.${i}.start`]}>
              <DateTimePicker step={15} value={s.start} onValueChange={(v) => update(s.key, { start: v })} />
            </Field>
            <Field label="Ends" required error={errors[`sessions.${i}.end`]}>
              <DateTimePicker step={15} value={s.end} onValueChange={(v) => update(s.key, { end: v })} />
            </Field>
            <div className="flex items-end">
              {rows.length > 1 ? (
                <Button size="sm" variant="ghost" iconOnly aria-label={`Remove time ${i + 1}`} onClick={() => setRows((r) => r.filter((x) => x.key !== s.key))}>
                  <X size={15} aria-hidden />
                </Button>
              ) : null}
            </div>
            <Field label="Where" className="sm:col-span-3">
              <Input value={s.location} onChange={(e) => update(s.key, { location: e.target.value })} placeholder="Student Center West 460" />
            </Field>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="outline" className="self-start" leading={<Plus size={15} aria-hidden />} disabled={rows.length >= EVENT_SESSIONS_MAX} onClick={add}>
        Add another time
      </Button>
    </fieldset>
  )
}

const EventDialog: FC<{ event: ClubEventRow | null; open: boolean; onClose: () => void }> = ({ event, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = event ? `event-${event.slug}` : 'event-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={event ? `Edit ${event.name}` : 'Add an event'}
      description="Shown on Events (under Upcoming until it ends, then Past events) and the homepage. Events on PIN as Public show on their own."
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} loading={pending}>
            Save
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => saveEvent(event?.slug ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.name}>
          <Input name="name" defaultValue={event?.name} placeholder="Vibez Talk" />
        </Field>
        <Field label="Status" error={errors.status} description="A cancelled event stays on the site, marked Cancelled, so nobody shows up to an empty room.">
          <SegmentedControl
            name="status"
            defaultValue={event?.status ?? 'scheduled'}
            options={[
              { value: 'scheduled', label: 'On' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </Field>
        <SessionsField initial={draftsFrom(event)} errors={errors} />
        <Field label="What it’s about" description="A few lines, shown on its card.">
          <TextArea name="description" rows={3} defaultValue={event?.description ?? ''} />
        </Field>
        <Field label="Tags" error={errors.tags} description="A few words, like discussion or free food. Press Enter after each.">
          <TagInput name="tags" defaultValue={event?.tags ?? []} transform={(t) => t.toLowerCase()} />
        </Field>
        <Field label="PIN page" description="Adds “RSVP on PIN” (or “View on PIN”) to its card." error={errors.href}>
          <Input name="href" inputMode="url" defaultValue={event?.href ?? ''} placeholder="https://pin.gsu.edu/event/…" />
        </Field>
        <Field label="Online link" description="Adds “Join online” to its card until it ends." error={errors.online_url}>
          <Input name="online_url" inputMode="url" defaultValue={event?.online_url ?? ''} placeholder="https://teams.microsoft.com/…" />
        </Field>
        <ImageField name="image_url" label="Picture" defaultValue={event?.image_url} error={errors.image_url} description="Shown across the top of its card, cropped to 2 by 1." />
        <Field label="What the picture says" description="For screen readers. For a flyer, give its key text: the event, the day, the time, and the place.">
          <TextArea name="image_alt" rows={2} defaultValue={event?.image_alt ?? ''} placeholder="Flyer: Vibez Talk, Thursday, April 9, 1 to 3 p.m., Student Center West 460" />
        </Field>
        <Switch name="published" defaultChecked={event?.published ?? true} description="Hidden ones stay here, and keep their check-ins.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

/** "Add an event", for the page's title */
export const AddEventButton: FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <>
      <Button
        size="sm"
        leading={<Plus size={15} aria-hidden />}
        disabled={disabled}
        onClick={() => {
          setKey((k) => k + 1)
          setOpen(true)
        }}
      >
        Add an event
      </Button>
      <EventDialog key={key} event={null} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

/** Edit or delete one of the club's own events (PIN's are edited on PIN) */
export const ClubEventMenu: FC<{ event: ClubEventRow; checkins: number }> = ({ event, checkins }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <>
      <ActionMenu
        label={`Actions for ${event.name}`}
        items={[
          {
            label: 'Edit',
            icon: <Pencil />,
            onSelect: () => {
              setKey((k) => k + 1)
              setOpen(true)
            },
          },
          'separator',
          {
            label: 'Delete',
            icon: <Trash2 />,
            danger: true,
            onSelect: async () => {
              const message = checkins
                ? `It comes off the site right away. Its ${checkins} check-in${checkins === 1 ? '' : 's'} stay on members’ histories, under its name, but no longer link to it.`
                : 'It comes off the site right away.'
              if (!(await confirm({ title: `Delete ${event.name}?`, message, variant: 'error', confirmLabel: 'Delete' }))) return
              const result = await deleteEvent(event.slug)
              if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
              router.refresh()
            },
          },
        ]}
      />
      <EventDialog key={key} event={event} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

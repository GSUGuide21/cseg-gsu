'use client'

import { CalendarCheck, CircleCheck } from 'lucide-react'
import { useId, useState, useTransition, type FC } from 'react'

import { sendRsvp } from '@/lib/dashboard/actions'
import type { ActionResult, FieldErrors } from '@/lib/dashboard/validate'

const input =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink placeholder:text-ink-faint focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand aria-invalid:border-danger'
const link = 'inline-flex w-fit cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.85rem] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * RSVP to one of the club's own events, on its card: a link that opens a name and an email,
 * then says you're on the list. Officers see who's coming on the event's check-in screen.
 */
export const EventRsvp: FC<{ eventId: string; eventName: string }> = ({ eventId, eventName }) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [done, setDone] = useState(false)

  if (done)
    return (
      <p role="status" className="m-0 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-success">
        <CircleCheck size={15} aria-hidden />
        You’re on the list. See you there.
      </p>
    )

  if (!open)
    return (
      <button type="button" className={link} onClick={() => setOpen(true)} aria-label={`RSVP to ${eventName}`}>
        <CalendarCheck size={14} aria-hidden />
        RSVP
      </button>
    )

  return (
    <form
      className="flex w-full flex-col gap-2.5 rounded-xl border border-line bg-fill/50 p-3.5"
      aria-label={`RSVP to ${eventName}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        form.set('event_id', eventId)
        start(async () => {
          setProblem('')
          const result: ActionResult = await sendRsvp(form).catch(() => ({ ok: false, error: 'Your RSVP didn’t go through.' }))
          if (result.ok) return setDone(true)
          setErrors(result.errors ?? {})
          setProblem(result.error ?? '')
        })
      }}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-name`} className="text-[0.8rem] font-semibold text-ink">
            Your name
          </label>
          <input id={`${id}-name`} name="name" autoComplete="name" maxLength={120} className={input} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
          {errors.name ? (
            <span id={`${id}-name-error`} className="text-[0.8rem] text-danger">
              {errors.name}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-email`} className="text-[0.8rem] font-semibold text-ink">
            Your email
          </label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" className={input} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? `${id}-email-error` : undefined} />
          {errors.email ? (
            <span id={`${id}-email-error`} className="text-[0.8rem] text-danger">
              {errors.email}
            </span>
          ) : null}
        </div>
      </div>
      {/* People never see this; bots fill it in */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {problem ? (
        <p role="alert" className="m-0 text-[0.85rem] text-danger">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="cursor-pointer rounded-lg border-0 bg-brand-solid px-3.5 py-2 text-[0.85rem] font-bold text-white hover:bg-brand-solid-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Count me in'}
        </button>
        <button type="button" className={link} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}

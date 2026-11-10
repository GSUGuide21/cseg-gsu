'use client'

import { CircleCheck } from 'lucide-react'
import { useState, useTransition, type FC } from 'react'

import { Field, Input, Select, TextArea } from '@/components/Form'
import { button, card, iconTile, inlineLink } from '@/globals/ui/styles'
import { sendJoinRequest } from '@/lib/dashboard/actions'
import { JOIN_LIMITS, YEARS, type ActionResult, type FieldErrors } from '@/lib/dashboard/validate'

/**
 * Asking to join from the site. It lands in the dashboard's Join requests, where an officer
 * adds whoever sent it to the roster; PIN stays as the other way in.
 */
export const JoinForm: FC<{ contactEmail: string }> = ({ contactEmail }) => {
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo)
    return (
      <div role="status" className={card({ accent: true, className: 'flex items-start gap-4 p-6' })}>
        <span className={iconTile} aria-hidden>
          <CircleCheck size={20} strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[1.05rem] font-bold text-ink">Thanks, we have your request.</p>
          <p className="m-0 text-[0.95rem] leading-relaxed text-muted">An officer will be in touch at {sentTo}. Come to an event in the meantime; everyone’s welcome.</p>
        </div>
      </div>
    )

  return (
    <form
      className={card({ padded: true, className: 'flex flex-col gap-4' })}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        start(async () => {
          setProblem('')
          const result: ActionResult = await sendJoinRequest(form).catch(() => ({ ok: false, error: 'Your request didn’t go through.' }))
          if (result.ok) {
            setErrors({})
            setSentTo(String(form.get('email') ?? '').trim())
          } else {
            setErrors(result.errors ?? {})
            setProblem(result.error ?? '')
          }
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={errors.name}>
          <Input name="name" autoComplete="name" maxLength={JOIN_LIMITS.name} />
        </Field>
        <Field label="Your email" required error={errors.email} description="Your GSU email, if you have one.">
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label="Major" error={errors.major}>
          <Input name="major" maxLength={JOIN_LIMITS.major} />
        </Field>
        <Field label="Year" error={errors.year}>
          <Select name="year" placeholder="Pick one" options={YEARS.map((y) => ({ value: y, label: y }))} />
        </Field>
      </div>
      <Field label="Anything you’d like us to know?" error={errors.message} description="What you’re hoping to get out of CSEG, or a question for the officers.">
        <TextArea name="message" rows={3} maxLength={JOIN_LIMITS.message} />
      </Field>
      {/* People never see this; bots fill it in */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {problem ? (
        <p role="alert" className="m-0 text-[0.9rem] text-danger">
          {problem} You can also email{' '}
          <a href={`mailto:${contactEmail}`} className={inlineLink}>
            {contactEmail}
          </a>
          .
        </p>
      ) : null}
      <button type="submit" className={button({ className: 'self-start max-[559px]:w-full' })} disabled={pending} aria-busy={pending}>
        {pending ? 'Sending…' : 'Ask to join'}
      </button>
    </form>
  )
}

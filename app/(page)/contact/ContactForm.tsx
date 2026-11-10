'use client'

import { CircleCheck } from 'lucide-react'
import { useState, useTransition, type FC } from 'react'

import { Field, Input, TextArea } from '@/components/Form'
import { button, card, iconTile, inlineLink } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { sendContactMessage } from '@/lib/dashboard/actions'
import { MESSAGE_LIMITS, type ActionResult, type FieldErrors } from '@/lib/dashboard/validate'

/**
 * Writing to the officers from the site. It lands in the dashboard's Messages; email stays
 * there as the way to reach them if this can't send. `reply` is what officers set it to say
 * once a message is sent.
 */
export const ContactForm: FC<{ contactEmail: string; reply?: string | null }> = ({ contactEmail, reply }) => {
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
          <p className="m-0 text-[1.05rem] font-bold text-ink">Thanks, your message is on its way.</p>
          <p className="m-0 text-[0.95rem] leading-relaxed whitespace-pre-line text-muted">{reply || `An officer will reply to ${sentTo}, usually within a few days.`}</p>
          <button type="button" className={cn(inlineLink, 'mt-1 w-fit cursor-pointer border-0 bg-transparent p-0 text-[0.9rem] font-semibold')} onClick={() => setSentTo(null)}>
            Send another
          </button>
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
          const result: ActionResult = await sendContactMessage(form).catch(() => ({ ok: false, error: 'Your message didn’t go through.' }))
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
          <Input name="name" autoComplete="name" maxLength={MESSAGE_LIMITS.name} />
        </Field>
        <Field label="Your email" required error={errors.email} description="Where we’ll reply.">
          <Input name="email" type="email" autoComplete="email" />
        </Field>
      </div>
      <Field label="Subject" error={errors.subject}>
        <Input name="subject" maxLength={MESSAGE_LIMITS.subject} />
      </Field>
      <Field label="Message" required error={errors.body}>
        <TextArea name="body" rows={6} maxLength={MESSAGE_LIMITS.body} />
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
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

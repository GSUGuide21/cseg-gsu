'use client'

import { CircleCheck } from 'lucide-react'
import { useState, useTransition, type FC } from 'react'

import { Field, Input, Select, TextArea } from '@/components/Form'
import { button, card } from '@/globals/ui/styles'
import { submitForm } from '@/lib/content/actions'
import { LIMITS, type FormField } from '@/lib/content/types'
import type { ActionResult, FieldErrors } from '@/lib/dashboard/validate'

const choice = 'flex cursor-pointer items-center gap-3 text-[0.95rem] text-ink'
const tick = 'size-4 shrink-0 accent-[var(--brand)]'

/** A form officers built, to fill in and send: each question drawn as its type asks */
export const PublicForm: FC<{ formId: string; fields: readonly FormField[] }> = ({ formId, fields }) => {
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState('')
  const [sent, setSent] = useState<string | null>(null)

  if (sent !== null)
    return (
      <div role="status" className={card({ accent: true, className: 'flex items-start gap-3 p-6' })}>
        <CircleCheck size={22} aria-hidden className="mt-0.5 shrink-0 text-success" />
        <p className="m-0 text-[1.05rem] leading-relaxed font-semibold whitespace-pre-line text-ink">{sent || 'Thanks, we have it.'}</p>
      </div>
    )

  return (
    <form
      className={card({ padded: true, className: 'flex flex-col gap-5' })}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        start(async () => {
          setProblem('')
          const result: ActionResult = await submitForm(formId, form).catch(() => ({ ok: false, error: 'That didn’t go through.' }))
          if (result.ok) return setSent(result.message ?? '')
          setErrors(result.errors ?? {})
          setProblem(result.error ?? (result.errors ? 'Some answers need another look.' : ''))
        })
      }}
    >
      {fields.map((f) =>
        f.type === 'radio' || f.type === 'checkboxes' ? (
          <fieldset key={f.id} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-[0.9rem] font-semibold text-ink">
              {f.label}
              {f.required ? <span className="text-danger"> *</span> : null}
            </legend>
            {f.options.map((o) => (
              <label key={o} className={choice}>
                <input type={f.type === 'radio' ? 'radio' : 'checkbox'} name={f.id} value={o} className={tick} />
                <span className="[overflow-wrap:anywhere]">{o}</span>
              </label>
            ))}
            {errors[f.id] ? <p className="m-0 text-[0.85rem] font-semibold text-danger">{errors[f.id]}</p> : null}
          </fieldset>
        ) : f.type === 'checkbox' ? (
          <div key={f.id} className="flex flex-col gap-1">
            <label className={choice}>
              <input type="checkbox" name={f.id} className={tick} />
              <span>
                {f.label}
                {f.required ? <span className="text-danger"> *</span> : null}
              </span>
            </label>
            {errors[f.id] ? <p className="m-0 text-[0.85rem] font-semibold text-danger">{errors[f.id]}</p> : null}
          </div>
        ) : (
          <Field key={f.id} label={f.label} required={f.required} error={errors[f.id]}>
            {f.type === 'textarea' ? (
              <TextArea name={f.id} rows={4} maxLength={LIMITS.answer} />
            ) : f.type === 'select' ? (
              <Select name={f.id} placeholder="Pick one" options={f.options.map((o) => ({ value: o, label: o }))} />
            ) : (
              <Input name={f.id} type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} maxLength={LIMITS.answer} autoComplete={f.type === 'email' ? 'email' : 'off'} />
            )}
          </Field>
        )
      )}
      {/* People never see this; bots fill it in */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {problem ? (
        <p role="alert" className="m-0 text-[0.92rem] font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={button({ className: 'self-start' })}>
        {pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}

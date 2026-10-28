'use client'

import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useId, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Input } from '../Input'
import { controlButton } from '../Input/variants'
import type { PasswordInputProps, PasswordRequirement } from './types'

/** Requirements most sign-up forms ask for; pass your own to `requirements` to change them */
export const DEFAULT_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Upper- and lowercase letters', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number or symbol', test: (p) => /[\d\W_]/.test(p) },
]

const WORDS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const
const BAR = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']

/**
 * A rough 0–4 strength: length counts most, then variety, and a repeated or sequential run,
 * or a very common password, pulls it down. A hint for people choosing one, not a security
 * check; the server should still enforce its own rules.
 */
export const passwordStrength = (p: string) => {
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (p.length >= 16) score++
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length
  if (kinds >= 3) score++
  if (kinds === 4 && p.length >= 10) score++
  if (/(.)\1{2,}/.test(p) || /(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|wer|asd)/i.test(p)) score--
  if (/^(password|passw0rd|letmein|welcome|qwerty|iloveyou|admin|panther|gsu)/i.test(p)) score = Math.min(score, 1)
  return Math.max(0, Math.min(4, score))
}

/**
 * A password field with a button to show what's typed. For a new password, `strength` and
 * `requirements` show how it measures up as it's typed.
 *
 *   <Field label="Password"><PasswordInput autoComplete="current-password" /></Field>
 *   <Field label="New password"><PasswordInput autoComplete="new-password" strength requirements={DEFAULT_REQUIREMENTS} /></Field>
 *
 * The strength and checklist are read with the field (aria-describedby), and changes to
 * them are announced politely.
 */
export const PasswordInput: FC<PasswordInputProps> = ({ strength = false, requirements, value, defaultValue, onChange, disabled, 'aria-describedby': describedBy, ...props }) => {
  const [shown, setShown] = useState(false)
  const [own, setOwn] = useState(String(defaultValue ?? ''))
  const password = value !== undefined ? String(value) : own
  const id = useId()
  const score = passwordStrength(password)
  const extra = [describedBy, strength ? `${id}-strength` : undefined, requirements?.length ? `${id}-reqs` : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <Input
        {...props}
        type={shown ? 'text' : 'password'}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(e) => {
          setOwn(e.target.value)
          onChange?.(e)
        }}
        // Shown as text, it still shouldn't go to a spell checker or get auto-capitalized
        spellCheck={false}
        autoCapitalize="off"
        aria-describedby={extra}
        trailing={
          <button
            type="button"
            onClick={() => setShown(!shown)}
            disabled={disabled}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className={cn(controlButton, '-mr-1.5')}
          >
            {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        }
      />
      {strength ? (
        <div id={`${id}-strength`} className="flex items-center gap-3" aria-live="polite">
          <div aria-hidden className="grid flex-1 grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={cn('h-1.5 rounded-full transition-colors', password && score >= n ? BAR[score] : 'bg-line')} />
            ))}
          </div>
          <span className="min-w-16 text-right text-[0.78rem] font-semibold text-ink-soft">
            {password ? (
              <>
                <span className="sr-only">Password strength: </span>
                {WORDS[score]}
              </>
            ) : null}
          </span>
        </div>
      ) : null}
      {requirements?.length ? (
        <ul id={`${id}-reqs`} className="m-0 flex list-none flex-col gap-1 p-0">
          {requirements.map((r) => {
            const met = r.test(password)
            return (
              <li key={r.label} className={cn('flex items-center gap-2 text-[0.8rem]', met ? 'text-success' : 'text-muted')}>
                {met ? <Check size={14} strokeWidth={3} aria-hidden /> : <X size={14} strokeWidth={2.5} aria-hidden />}
                <span className="sr-only">{met ? 'Met: ' : 'Not yet: '}</span>
                {r.label}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

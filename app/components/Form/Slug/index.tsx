'use client'

import { Check, CircleAlert, Link2, Lock, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Spinner } from '../../Spinner'
import { useFieldControl } from '../Field'
import { control, controlButton, controlInput } from '../Input/variants'
import { useControllable } from '../useControllable'
import { SLUG_MAX, slugify } from './slugify'
import type { SlugCheck, SlugInputProps } from './types'

export { slugify, SLUG_MAX } from './slugify'

/** How long typing has to pause before asking whether a slug is free */
const CHECK_DELAY = 400

/** A worded button at the box's end ("Change", "Use the title"): icon and words in a row, on one line */
const textButton = cn(controlButton, 'flex w-auto items-center gap-1.5 px-2 text-[0.8rem] font-semibold whitespace-nowrap')

/**
 * The web-address part of a post, page, or event: "/posts/fall-social-recap".
 *
 *   <Field label="Web address">
 *     <SlugInput name="slug" source={title} prefix="/posts/" checkAvailability={isSlugFree} />
 *   </Field>
 *
 * It follows `source` (the title) until edited by hand, keeps to lowercase letters,
 * numbers, and hyphens as it's typed, and can ask whether a slug is taken. A `locked` slug
 * (something already published) takes a deliberate "Change" first, since changing it
 * breaks links people already have.
 */
export const SlugInput: FC<SlugInputProps> = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  source,
  prefix,
  checkAvailability,
  locked = false,
  name,
  size = 'md',
  id,
  disabled,
  required,
  invalid,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}) => {
  const fromSource = slugify(source ?? '')
  // Following the source only while there's no slug yet: an existing one (a saved post's)
  // never changes on its own, even when it happens to match the title
  const [touched, setTouched] = useState(() => !!(valueProp ?? defaultValue) || locked)
  const [own, setOwn] = useControllable(valueProp, defaultValue ?? fromSource, onValueChange)
  const [unlocked, setUnlocked] = useState(!locked)
  const [check, setCheck] = useState<{ slug: string; state: 'checking' } | { slug: string; state: 'done'; result: SlugCheck } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const statusId = `${uid}-status`

  const slug = touched ? own : fromSource
  // A followed slug is the caller's value too
  useEffect(() => {
    if (!touched && fromSource !== own) setOwn(fromSource)
    // Only when the source moves on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSource, touched])

  // Ask whether it's free once typing pauses; a newer slug's answer replaces an older one
  const checkRef = useRef(checkAvailability)
  checkRef.current = checkAvailability
  const final = slugify(slug)
  useEffect(() => {
    if (!checkRef.current || !final) return setCheck(null)
    let stale = false
    const timer = window.setTimeout(async () => {
      setCheck({ slug: final, state: 'checking' })
      try {
        const result = await checkRef.current!(final)
        if (!stale) setCheck({ slug: final, state: 'done', result })
      } catch {
        if (!stale) setCheck(null)
      }
    }, CHECK_DELAY)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [final])

  const taken = check?.state === 'done' && check.slug === final && !check.result.ok
  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid: invalid || taken || undefined,
    'aria-describedby': [describedBy, statusId].filter(Boolean).join(' '),
  })
  // Read-only (not disabled) while locked, so it's still sent with the form
  const editable = !locked || unlocked

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn(control({ size, invalid: field.invalid, disabled: field.disabled }), 'pr-1.5', className)}>
        {prefix ? (
          <span aria-hidden className="flex shrink-0 items-center gap-1.5 text-[0.9em] text-ink-faint">
            <Link2 size={15} className="shrink-0" />
            {prefix}
          </span>
        ) : null}
        <input
          {...field.controlProps}
          ref={inputRef}
          name={name}
          value={editable ? slug : final}
          readOnly={!editable}
          aria-label={field.labelId ? undefined : (ariaLabel ?? 'Web address')}
          maxLength={SLUG_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          onChange={(e) => {
            setTouched(true)
            setOwn(slugify(e.target.value, { trailing: true }))
          }}
          // No hyphen left dangling at the end
          onBlur={() => slug !== final && setOwn(final)}
          className={cn(controlInput, 'font-medium')}
        />
        {locked && !unlocked ? (
          <button
            type="button"
            onClick={() => {
              setUnlocked(true)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            className={textButton}
          >
            <Lock size={14} aria-hidden /> Change
          </button>
        ) : touched && source !== undefined && fromSource && slug !== fromSource ? (
          <button
            type="button"
            onClick={() => {
              setTouched(false)
              setOwn(fromSource)
            }}
            className={textButton}
          >
            <RotateCcw size={14} aria-hidden /> Use the title
          </button>
        ) : null}
      </div>
      <p id={statusId} aria-live="polite" className="m-0 flex min-h-5 items-center gap-1.5 text-[0.8rem]">
        {locked && unlocked ? (
          <span className="flex items-center gap-1.5 font-semibold text-warning">
            <CircleAlert size={14} aria-hidden /> It’s live: changing it breaks links people already have.
          </span>
        ) : check?.slug === final && check.state === 'checking' ? (
          <span className="flex items-center gap-1.5 text-muted">
            <Spinner size={14} label="Checking" /> Checking…
          </span>
        ) : check?.slug === final && check.state === 'done' ? (
          check.result.ok ? (
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <Check size={14} strokeWidth={3} aria-hidden /> Available
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-danger">
              <CircleAlert size={14} aria-hidden /> {check.result.message}
            </span>
          )
        ) : null}
      </p>
    </div>
  )
}

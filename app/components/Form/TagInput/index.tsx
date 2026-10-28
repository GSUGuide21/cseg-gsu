'use client'

import { CircleAlert } from 'lucide-react'
import { useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Badge } from '../../Badge'
import { useFieldControl } from '../Field'
import { control, controlInput } from '../Input/variants'
import { useControllable } from '../useControllable'
import type { TagInputProps } from './types'

/**
 * Words typed in freely, each becoming a removable tag: interests, emails to invite, skills.
 * (To pick tags from a fixed list, use Select type="tags".)
 *
 *   <Field label="Invite by email" description="Press Enter or comma after each.">
 *     <TagInput name="invite" validate={(t) => (/@student\.gsu\.edu$/.test(t) ? undefined : 'Use a GSU email')} />
 *   </Field>
 *
 * Enter or a comma adds what's typed; pasting a list adds each; Backspace in the empty box
 * removes the last tag. Each tag has its own remove button, and changes are announced.
 */
export const TagInput: FC<TagInputProps> = ({
  value: valueProp,
  defaultValue = [],
  onValueChange,
  max,
  validate,
  transform,
  separators = [','],
  suggestions,
  placeholder,
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
  const [tags, setTags] = useControllable(valueProp, defaultValue, onValueChange)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [said, setSaid] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const errorId = `${uid}-error`
  const field = useFieldControl({
    id,
    disabled,
    // Required means at least one tag, not text in the box
    required: required && tags.length === 0,
    invalid: invalid || !!error || undefined,
    'aria-describedby': [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  })
  const full = max !== undefined && tags.length >= max

  /** Adds what's given (split on separators), keeping the ones that pass; returns whether all did */
  const add = (raw: string) => {
    const split = new RegExp(`[${separators.map((s) => s.replace(/[\\\]^-]/g, '\\$&')).join('')}\\n]`)
    const parts = raw.split(split).map((t) => (transform ? transform(t.trim()) : t.trim())).filter(Boolean)
    if (!parts.length) return true
    const next = [...tags]
    let problem: string | null = null
    for (const t of parts) {
      if (next.some((x) => x.toLowerCase() === t.toLowerCase())) continue
      if (max !== undefined && next.length >= max) {
        problem = `Up to ${max} only`
        break
      }
      const message = validate?.(t)
      if (message) {
        problem = message
        continue
      }
      next.push(t)
    }
    const added = next.slice(tags.length)
    if (added.length) {
      setTags(next)
      setSaid(`Added ${added.join(', ')}`)
    }
    setError(problem)
    return !problem
  }

  const remove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
    setSaid(`Removed ${tag}`)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(control({ size, invalid: field.invalid, disabled: field.disabled }), 'flex-wrap gap-1.5 py-1.5', className)}
        onClick={(e) => e.target === e.currentTarget && inputRef.current?.focus()}
      >
        {tags.map((t) => (
          <Badge key={t} size="sm" tone="brand" onRemove={field.disabled ? undefined : () => remove(t)}>
            {t}
          </Badge>
        ))}
        <input
          {...field.controlProps}
          ref={inputRef}
          value={draft}
          aria-label={field.labelId ? undefined : ariaLabel}
          list={suggestions?.length ? `${uid}-suggestions` : undefined}
          placeholder={full ? undefined : tags.length ? undefined : placeholder}
          readOnly={full}
          enterKeyHint="enter"
          autoComplete="off"
          onChange={(e) => {
            const v = e.target.value
            const native = e.nativeEvent as InputEvent
            // Picking from the suggestions list adds it straight away
            if (suggestions?.includes(v) && (native.inputType === 'insertReplacementText' || native.inputType === undefined)) {
              if (add(v)) setDraft('')
              return
            }
            if (separators.some((s) => v.endsWith(s))) {
              if (add(v.slice(0, -1))) setDraft('')
              else setDraft(v.slice(0, -1))
              return
            }
            setDraft(v)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Enter adds a tag; with nothing typed it's free to submit the form
              if (!draft.trim()) return
              e.preventDefault()
              if (add(draft)) setDraft('')
            } else if (e.key === 'Backspace' && !draft && tags.length) {
              e.preventDefault()
              remove(tags[tags.length - 1])
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (!/[,\n;]/.test(text)) return
            e.preventDefault()
            if (add(text.replace(/;/g, ','))) setDraft('')
          }}
          onBlur={() => {
            // Leaving with a word typed keeps it, as a tag
            if (draft.trim() && add(draft)) setDraft('')
          }}
          className={cn(controlInput, 'min-w-24 basis-24 py-1')}
        />
        {suggestions?.length ? (
          <datalist id={`${uid}-suggestions`}>
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        ) : null}
      </div>
      {name ? tags.map((t) => <input key={t} type="hidden" name={name} value={t} />) : null}
      {error ? (
        <p id={errorId} className="m-0 flex items-start gap-1.5 text-[0.8rem] leading-snug font-semibold text-danger">
          <CircleAlert size={15} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  )
}

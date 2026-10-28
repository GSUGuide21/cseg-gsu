'use client'

import { Star } from 'lucide-react'
import { useId, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useField } from '../Field'
import { useControllable } from '../useControllable'
import type { RatingProps } from './types'

const PX = { sm: 16, md: 22, lg: 28 }

/** One star, filled to `fill` (0–1) from the left */
const StarShape: FC<{ fill: number; size: number }> = ({ fill, size }) => (
  <span className="relative inline-grid" style={{ width: size, height: size }}>
    <Star size={size} strokeWidth={1.75} aria-hidden className="text-ink-faint/50" />
    {fill > 0 ? (
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <Star size={size} strokeWidth={1.75} aria-hidden className="fill-series-4 text-series-4" />
      </span>
    ) : null}
  </span>
)

/**
 * Stars to rate something (an event, a workshop), or to show a rating.
 *
 *   <Field label="How was the workshop?">
 *     <Rating labels={['Poor', 'Fair', 'Good', 'Great', 'Loved it']} />
 *   </Field>
 *   <Rating readOnly value={4.5} />
 *
 * Native radio buttons underneath, one per star: the arrow keys change the rating, each
 * star is read as "3 stars", and the value is sent with a form.
 */
export const Rating: FC<RatingProps> = ({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  labels,
  readOnly = false,
  clearable = true,
  size = 'md',
  name,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const [hover, setHover] = useState<number | null>(null)
  const field = useField()
  const generated = useId()
  const px = PX[size]

  if (readOnly) {
    const v = Math.max(0, Math.min(max, value))
    return (
      <span role="img" aria-label={`${v} out of ${max} stars`} className={cn('inline-flex items-center gap-0.5', className)}>
        {Array.from({ length: max }, (_, i) => (
          <StarShape key={i} size={px} fill={Math.max(0, Math.min(1, v - i))} />
        ))}
      </span>
    )
  }

  const off = disabled || !!field?.disabled
  const shown = hover ?? value
  const word = labels?.[Math.round(shown) - 1]

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <div
        role="radiogroup"
        // The Field's id goes on the group: on the first radio, its label would rename that one
        id={field?.id}
        aria-labelledby={ariaLabel ? undefined : field?.labelId}
        aria-label={ariaLabel ?? (field ? undefined : 'Rating')}
        aria-describedby={[field?.descriptionId, field?.errorId].filter(Boolean).join(' ') || undefined}
        onPointerLeave={() => setHover(null)}
        className={cn('inline-flex items-center', off && 'opacity-50')}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1
          return (
            <label
              key={n}
              onPointerEnter={() => !off && setHover(n)}
              // Picking the current rating again clears it (a radio's change event doesn't fire then)
              onClick={(e) => {
                if (!off && clearable && n === value && e.target instanceof HTMLInputElement) {
                  e.preventDefault()
                  setValue(0)
                }
              }}
              className={cn(
                'relative grid cursor-pointer place-items-center rounded-md p-0.5 transition-transform has-focus-visible:outline-2 has-focus-visible:outline-brand',
                !off && 'hover:scale-110 motion-reduce:hover:scale-100',
                off && 'cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name={name ?? generated}
                value={n}
                    checked={value === n}
                disabled={off}
                onChange={() => setValue(n)}
                className="absolute size-px appearance-none opacity-0"
              />
              <span className="sr-only">
                {n} {n === 1 ? 'star' : 'stars'}
                {labels?.[i] ? `, ${labels[i]}` : ''}
              </span>
              <StarShape size={px} fill={shown >= n ? 1 : 0} />
            </label>
          )
        })}
      </div>
      {labels ? (
        <span aria-hidden className="min-w-16 text-[0.85rem] font-semibold text-ink-soft">
          {word ?? ''}
        </span>
      ) : null}
    </div>
  )
}

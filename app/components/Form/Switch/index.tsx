'use client'

import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { ChoiceText } from '../Checkbox'
import { useFieldControl } from '../Field'
import { useControllable } from '../useControllable'
import type { SwitchProps } from './types'

const TRACK = { sm: 'h-5 w-9', md: 'h-6 w-11' }
const THUMB = { sm: 'size-4 peer-checked:translate-x-4', md: 'size-5 peer-checked:translate-x-5' }

/**
 * An on/off setting that takes effect right away: notifications, dark mode, "visible to
 * members". For something that's only applied when a form is sent, a Checkbox reads better.
 *
 *   <Switch defaultChecked onCheckedChange={setEmails}>Email me about new events</Switch>
 *
 * A native checkbox with role="switch", so it's sent with a form, Space toggles it, and
 * screen readers say "on" and "off".
 */
export const Switch: FC<SwitchProps> = ({
  children,
  description,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  onChange,
  size = 'md',
  switchPosition = 'end',
  invalid,
  className,
  id,
  disabled,
  required,
  'aria-describedby': describedBy,
  ...props
}) => {
  const [checked, setChecked] = useControllable(checkedProp, defaultChecked, onCheckedChange)
  const descriptionId = useId()
  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid,
    'aria-describedby': [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') || undefined,
  })
  const end = switchPosition === 'end'

  const toggle = (
    <span className={cn('relative inline-flex shrink-0 items-center', TRACK[size], end ? 'order-last' : '', (children || description) && 'mt-px')}>
      <input
        {...props}
        {...field.controlProps}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked)
          onChange?.(e)
        }}
        className={cn(
          'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-full bg-ink-faint/45 transition-colors',
          'checked:bg-brand-solid hover:bg-ink-faint/60 checked:hover:bg-brand-solid-hover',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          'aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger disabled:cursor-not-allowed'
        )}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none relative ml-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-150 motion-reduce:transition-none',
          THUMB[size]
        )}
      />
    </span>
  )

  return (
    <label
      className={cn(
        'group/choice flex cursor-pointer items-start gap-3 has-disabled:cursor-not-allowed has-disabled:opacity-60',
        end && 'justify-between',
        className
      )}
    >
      {toggle}
      <ChoiceText label={children} description={description} descriptionId={descriptionId} />
    </label>
  )
}

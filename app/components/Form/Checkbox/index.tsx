'use client'

import { Check, Minus } from 'lucide-react'
import { useEffect, useId, useRef, type FC, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import { cn } from '@/lib/cn'

import { Fieldset, useFieldControl, useFieldset } from '../Field'
import { useControllable } from '../useControllable'
import { CheckboxGroupContext, useCheckboxGroup } from './Context'
import type { CheckboxGroupProps, CheckboxProps } from './types'

/**
 * The clickable row around a checkbox or radio button. "card" draws a tile that lights up
 * when its input is checked. Shared with Radio.
 */
export const choice = tv({
  base: 'group/choice flex cursor-pointer items-start gap-3 has-disabled:cursor-not-allowed has-disabled:opacity-60',
  variants: {
    variant: {
      default: '',
      card: [
        'rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/45',
        'has-checked:border-brand has-checked:bg-brand-wash has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
      ],
    },
  },
  defaultVariants: { variant: 'default' },
})

/** The checkbox or radio itself: the native input, restyled */
export const choiceInput = [
  'peer size-5 shrink-0 cursor-pointer appearance-none border-2 border-ink-faint/70 bg-surface transition-colors',
  'group-hover/choice:border-brand checked:border-brand-solid checked:bg-brand-solid',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  'aria-invalid:border-danger disabled:cursor-not-allowed',
]

/** Label and description beside a checkbox or radio */
export const ChoiceText: FC<{ label?: ReactNode; description?: ReactNode; descriptionId: string }> = ({
  label,
  description,
  descriptionId,
}) =>
  label || description ? (
    <span className="flex min-w-0 flex-col gap-0.5 pt-px">
      {label ? <span className="text-[0.9rem] leading-snug text-ink">{label}</span> : null}
      {description ? (
        <span id={descriptionId} className="text-[0.8rem] leading-snug text-muted">
          {description}
        </span>
      ) : null}
    </span>
  ) : null

/**
 * A checkbox with its label. On its own it's a yes/no ("I agree to the terms"); inside a
 * CheckboxGroup, give it a `value` and the group tracks which are checked.
 */
export const Checkbox: FC<CheckboxProps> = ({
  children,
  description,
  indeterminate = false,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  onChange,
  invalid,
  variant,
  value,
  name,
  className,
  id,
  disabled,
  required,
  'aria-describedby': describedBy,
  ...props
}) => {
  const group = useCheckboxGroup()
  const fieldset = useFieldset()
  const ref = useRef<HTMLInputElement>(null)
  const descriptionId = useId()
  const [ownChecked, setOwnChecked] = useControllable(checkedProp, defaultChecked, onCheckedChange)
  const inGroup = !!group && value !== undefined
  const checked = inGroup ? group.value.includes(String(value)) : ownChecked
  // Standalone, it may sit in a Field; in a group, the group's fieldset describes it
  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid: invalid ?? (fieldset.invalid || undefined),
    'aria-describedby': [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') || undefined,
  })

  // `indeterminate` is a DOM property with no HTML attribute
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className={choice({ variant: variant ?? group?.variant, className })}>
      <span className="relative mt-px grid size-5 shrink-0 place-items-center">
        <input
          {...props}
          {...field.controlProps}
          ref={ref}
          type="checkbox"
          name={name ?? group?.name}
          value={value}
          checked={checked}
          onChange={(e) => {
            if (inGroup) group.toggle(String(value), e.target.checked)
            else setOwnChecked(e.target.checked)
            onChange?.(e)
          }}
          className={cn(choiceInput, 'rounded-[0.35rem] indeterminate:border-brand-solid indeterminate:bg-brand-solid')}
        />
        <Check
          size={14}
          strokeWidth={3.25}
          aria-hidden
          className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
        />
        <Minus
          size={14}
          strokeWidth={3.25}
          aria-hidden
          className="pointer-events-none absolute text-white opacity-0 peer-indeterminate:opacity-100"
        />
      </span>
      <ChoiceText label={children} description={description} descriptionId={descriptionId} />
    </label>
  )
}

/**
 * Several checkboxes under one legend; `value` lists the checked ones.
 *
 *   <CheckboxGroup legend="Which events interest you?" name="interests" defaultValue={['social']}>
 *     <Checkbox value="social">Socials</Checkbox>
 *     <Checkbox value="workshops">Workshops</Checkbox>
 *   </CheckboxGroup>
 */
export const CheckboxGroup: FC<CheckboxGroupProps> = ({
  name,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  variant = 'default',
  children,
  ...fieldset
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const toggle = (v: string, on: boolean) => setValue(on ? [...value.filter((x) => x !== v), v] : value.filter((x) => x !== v))
  return (
    <CheckboxGroupContext.Provider value={{ name, value, toggle, variant }}>
      <Fieldset {...fieldset}>{children}</Fieldset>
    </CheckboxGroupContext.Provider>
  )
}

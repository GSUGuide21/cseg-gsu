'use client'

import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { ChoiceText, choice, choiceInput } from '../Checkbox'
import { Fieldset } from '../Field'
import { useControllable } from '../useControllable'
import { RadioGroupContext, useRadioGroup } from './Context'
import type { RadioGroupProps, RadioProps } from './types'

/** One choice in a RadioGroup. Arrow keys move between choices, as with any native radios. */
export const Radio: FC<RadioProps> = ({ value, children, description, className, onChange, 'aria-describedby': describedBy, ...props }) => {
  const group = useRadioGroup()
  const descriptionId = useId()
  return (
    <label className={choice({ variant: group.variant, className })}>
      <span className="relative mt-px grid size-5 shrink-0 place-items-center">
        <input
          {...props}
          type="radio"
          name={group.name}
          value={value}
          checked={group.value === value}
          required={group.required}
          aria-describedby={[describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') || undefined}
          onChange={(e) => {
            if (e.target.checked) group.select(value)
            onChange?.(e)
          }}
          // Radios can't take aria-invalid; the group's fieldset points at its error instead
          className={cn(choiceInput, 'rounded-full', group.invalid && 'border-danger')}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute size-2 scale-0 rounded-full bg-white transition-transform peer-checked:scale-100 motion-reduce:transition-none"
        />
      </span>
      <ChoiceText label={children} description={description} descriptionId={descriptionId} />
    </label>
  )
}

/**
 * Pick one of several choices.
 *
 *   <RadioGroup legend="Year" name="year" required>
 *     <Radio value="freshman">Freshman</Radio>
 *     <Radio value="sophomore">Sophomore</Radio>
 *   </RadioGroup>
 */
export const RadioGroup: FC<RadioGroupProps> = ({
  name,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  variant = 'default',
  required = false,
  children,
  ...fieldset
}) => {
  const generated = useId()
  const [value, setValue] = useControllable<string | null>(valueProp, defaultValue, onValueChange as (v: string | null) => void)
  return (
    <RadioGroupContext.Provider
      value={{ name: name ?? generated, value, select: setValue, required, invalid: !!fieldset.error, variant }}
    >
      <Fieldset {...fieldset} required={required}>
        {children}
      </Fieldset>
    </RadioGroupContext.Provider>
  )
}

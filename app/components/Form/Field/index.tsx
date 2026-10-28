'use client'

import { CircleAlert } from 'lucide-react'
import { createContext, useContext, useId, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Label } from './Label'
import type { FieldContextValue, FieldControlOptions, FieldProps, FieldsetProps } from './types'

const FieldContext = createContext<FieldContextValue | null>(null)

/** The Field around a control, if any */
export const useField = () => useContext(FieldContext)

/**
 * Wires a control to its Field: the id the label points at, help text and errors in
 * `aria-describedby`, and the field's invalid, required, and disabled state. Spread
 * `controlProps` onto the focusable element.
 */
export function useFieldControl(own: FieldControlOptions = {}) {
  const field = useField()
  const invalid = own.invalid ?? field?.invalid ?? false
  const disabled = own.disabled ?? field?.disabled ?? false
  const required = own.required ?? field?.required ?? false
  const describedBy = [own['aria-describedby'], field?.descriptionId, field?.errorId].filter(Boolean).join(' ')
  return {
    controlProps: {
      id: own.id ?? field?.id,
      disabled,
      required,
      'aria-invalid': invalid || undefined,
      'aria-describedby': describedBy || undefined,
    },
    invalid,
    disabled,
    labelId: field?.labelId,
    floating: field?.labelType === 'floating',
  }
}

/** Help text and error under a control or group */
const Messages: FC<{ description?: ReactNode; descriptionId?: string; error?: ReactNode; errorId?: string }> = ({
  description,
  descriptionId,
  error,
  errorId,
}) => (
  <>
    {description ? (
      <p id={descriptionId} className="m-0 text-[0.8rem] leading-relaxed text-muted">
        {description}
      </p>
    ) : null}
    {error ? (
      <p id={errorId} className="m-0 flex items-start gap-1.5 text-[0.8rem] leading-snug font-semibold text-danger">
        <CircleAlert size={15} className="mt-px shrink-0" aria-hidden />
        <span>{error}</span>
      </p>
    ) : null}
  </>
)

/**
 * A labeled control with optional help text and error message.
 *
 *   <Field label="Email" description="Your GSU address" error={errors.email} required>
 *     <Input type="email" name="email" />
 *   </Field>
 */
export const Field: FC<FieldProps> = ({
  label,
  labelType = 'normal',
  description,
  error,
  required = false,
  disabled = false,
  id,
  className,
  children,
}) => {
  const generated = useId()
  const controlId = id ?? generated
  const context: FieldContextValue = {
    id: controlId,
    labelId: `${controlId}-label`,
    descriptionId: description ? `${controlId}-description` : undefined,
    errorId: error ? `${controlId}-error` : undefined,
    invalid: !!error,
    required,
    disabled,
    labelType,
  }
  const labelEl = (
    <Label
      id={context.labelId}
      htmlFor={controlId}
      required={required}
      floating={labelType === 'floating'}
      className={labelType === 'inline' ? '@md:pt-2.5' : undefined}
    >
      {label}
    </Label>
  )

  const body = (
    <div
      className={cn(
        labelType === 'inline' ? 'grid gap-x-4 gap-y-1.5 @md:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)]' : 'flex flex-col gap-1.5',
        disabled && 'opacity-80',
        labelType !== 'inline' && className
      )}
    >
      {labelType === 'floating' ? null : labelEl}
      <div className="flex min-w-0 flex-col gap-1.5">
        {labelType === 'floating' ? (
          <div className="group relative">
            {children}
            {labelEl}
          </div>
        ) : (
          children
        )}
        <Messages description={description} descriptionId={context.descriptionId} error={error} errorId={context.errorId} />
      </div>
    </div>
  )

  return (
    <FieldContext.Provider value={context}>
      {labelType === 'inline' ? (
        // Inline labels sit beside the control only when the field itself has room (28rem),
        // whatever the screen size, so a narrow column of a wide page still stacks. The
        // container is a wrapper because an element can't query its own width.
        <div className={cn('@container', className)}>{body}</div>
      ) : (
        body
      )}
    </FieldContext.Provider>
  )
}

/** Invalid state for the choices inside a Fieldset (CheckboxGroup, RadioGroup) */
const FieldsetContext = createContext<{ invalid: boolean; describedBy?: string }>({ invalid: false })
export const useFieldset = () => useContext(FieldsetContext)

/** A group of related choices under one legend, such as checkboxes or radio buttons. */
export const Fieldset: FC<FieldsetProps> = ({
  legend,
  description,
  error,
  required = false,
  disabled = false,
  orientation = 'vertical',
  className,
  children,
}) => {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <FieldsetContext.Provider value={{ invalid: !!error, describedBy }}>
      <fieldset disabled={disabled} aria-describedby={describedBy} className={cn('m-0 flex min-w-0 flex-col gap-2 border-0 p-0', className)}>
        <legend className="mb-1 p-0 text-[0.85rem] leading-snug font-semibold text-ink">
          {legend}
          {required ? (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
        </legend>
        {description ? (
          <p id={descriptionId} className="-mt-1 mb-1 text-[0.8rem] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
        <div className={orientation === 'horizontal' ? 'flex flex-wrap gap-x-6 gap-y-3' : 'flex flex-col gap-3'}>{children}</div>
        <Messages error={error} errorId={errorId} />
      </fieldset>
    </FieldsetContext.Provider>
  )
}

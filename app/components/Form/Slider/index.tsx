'use client'

import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { useControllable } from '../useControllable'
import { SliderTrack } from './Track'
import type { RangeSliderProps, SliderMark, SliderProps, SliderType } from './types'

/**
 * Readouts the value box has to fit: both ends, the steps beside them, and every mark.
 * Formatted values are rarely widest in the middle, so these cover the usual cases
 * ("100%", "-50", "$1,000", "Free").
 */
const widestValues = (min: number, max: number, step: number, marks: readonly SliderMark[] | undefined, format: (v: number) => string) => {
  // Rounded to the step's places, so 0.1 + 0.2 doesn't reserve room for 0.30000000000000004
  const places = (String(step).split('.')[1] ?? '').length
  const near = [min + step, max - step].map((v) => Number(v.toFixed(places)))
  return [...new Set([min, max, ...near, ...(marks ?? []).map((m) => (typeof m === 'number' ? m : m.value))].map(format))]
}

/** The track and its value readout, side by side (or stacked when vertical) */
const Layout: FC<{ type: SliderType; readout?: ReactNode; sizers?: string[]; className?: string; children: ReactNode }> = ({
  type,
  readout,
  sizers = [],
  className,
  children,
}) => (
  // Horizontal: lined up with the track's own 20px height, not the room under it for mark labels
  <div className={cn('flex gap-3', type === 'vertical' ? 'w-fit flex-col-reverse items-center' : 'items-start', className)}>
    {children}
    {readout !== undefined ? (
      // Screen readers get the value from the thumbs; this is for sighted readers. The
      // hidden copies of the widest readouts hold its width, so the track beside it doesn't
      // shrink and grow as the number changes.
      <span aria-hidden className={cn('grid shrink-0 text-[0.85rem] font-semibold text-ink tabular-nums', type === 'vertical' ? 'justify-items-center' : 'justify-items-end leading-5')}>
        {sizers.map((t) => (
          <span key={t} className="invisible col-start-1 row-start-1 whitespace-nowrap">
            {t}
          </span>
        ))}
        <span className="col-start-1 row-start-1 whitespace-nowrap">{readout}</span>
      </span>
    ) : null}
  </div>
)

/**
 * Pick a number by dragging.
 *
 *   <Field label="Volume"><Slider defaultValue={30} formatValue={(v) => `${v}%`} /></Field>
 */
export const Slider: FC<SliderProps> = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  type = 'horizontal',
  showValue = true,
  formatValue,
  name,
  id,
  disabled,
  invalid,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  ...rest
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue ?? min, onValueChange)
  const field = useFieldControl({ id, disabled, invalid, 'aria-describedby': describedBy })
  const format = formatValue ?? String
  return (
    <Layout
      type={type}
      readout={showValue ? format(value) : undefined}
      sizers={showValue ? widestValues(min, max, rest.step ?? 1, rest.marks, format) : undefined}
      className={className}
    >
      <SliderTrack
        {...rest}
        values={[value]}
        onValuesChange={([v]) => setValue(v)}
        min={min}
        max={max}
        type={type}
        formatValue={formatValue}
        id={field.controlProps.id}
        labelledBy={ariaLabel ? undefined : field.labelId}
        thumbLabels={[ariaLabel]}
        describedBy={field.controlProps['aria-describedby']}
        disabled={field.disabled}
        invalid={field.invalid}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </Layout>
  )
}

/**
 * Pick a range with two thumbs, e.g. a price or time window. The thumbs can't cross, and
 * `minDistance` keeps them apart. With `name`, both ends are sent under that name, low first.
 *
 *   <Field label="Budget">
 *     <RangeSlider min={0} max={500} step={10} defaultValue={[50, 200]} formatValue={(v) => `$${v}`} />
 *   </Field>
 */
export const RangeSlider: FC<RangeSliderProps> = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  type = 'horizontal',
  showValue = true,
  formatValue,
  thumbLabels = ['Minimum', 'Maximum'],
  name,
  id,
  disabled,
  invalid,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  ...rest
}) => {
  const [value, setValue] = useControllable<readonly [number, number]>(
    valueProp,
    defaultValue ?? [min, max],
    onValueChange as ((v: readonly [number, number]) => void) | undefined
  )
  const field = useFieldControl({ id, disabled, invalid, 'aria-describedby': describedBy })
  const format = formatValue ?? String
  // Both ends could be at their widest at once
  const widest = showValue ? widestValues(min, max, rest.step ?? 1, rest.marks, format).map((w) => `${w} – ${w}`) : undefined
  return (
    <Layout type={type} readout={showValue ? `${format(value[0])} – ${format(value[1])}` : undefined} sizers={widest} className={className}>
      <SliderTrack
        {...rest}
        values={value}
        onValuesChange={([lo, hi]) => setValue([lo, hi])}
        min={min}
        max={max}
        type={type}
        formatValue={formatValue}
        id={field.controlProps.id}
        labelledBy={field.labelId}
        thumbLabels={ariaLabel ? thumbLabels.map((t) => `${ariaLabel}, ${t}`) : thumbLabels}
        describedBy={field.controlProps['aria-describedby']}
        disabled={field.disabled}
        invalid={field.invalid}
      />
      {name ? value.map((v, i) => <input key={i} type="hidden" name={name} value={v} />) : null}
    </Layout>
  )
}

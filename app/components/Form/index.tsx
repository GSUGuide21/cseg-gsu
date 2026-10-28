import type { ComponentProps, FC } from 'react'

import { cn } from '@/lib/cn'

/**
 * Form controls. Wrap each control in a Field for its label, help text, and error; use a
 * CheckboxGroup or RadioGroup (which bring their own legend) for sets of choices.
 *
 *   <Form action={join}>
 *     <Field label="Name" required><Input name="name" autoComplete="name" /></Field>
 *     <Field label="Major"><Select name="major" type="combobox" options={MAJORS} /></Field>
 *     <RadioGroup legend="Year" name="year">…</RadioGroup>
 *   </Form>
 */
export const Form: FC<ComponentProps<'form'>> = ({ className, ...props }) => (
  <form {...props} className={cn('flex flex-col gap-5', className)} />
)

export { Checkbox, CheckboxGroup } from './Checkbox'
export { ColorPanel, ColorPicker } from './ColorPicker'
export { ColorDetails } from './ColorPicker/Details'
export { blend, colorFormats, contrastRatio, parseColor, parseColorWithAlpha, wcagRating, withAlpha, type ColorValue } from './ColorPicker/color'
export { DatePicker } from './Date'
export { DateRangePicker } from './Date/Range'
export { Calendar } from './Date/Calendar'
export { DateTimePicker } from './DateTime'
export { Field, Fieldset, useField, useFieldControl } from './Field'
export { Label } from './Field/Label'
export { FileInput } from './File'
export { Input } from './Input'
export { NumberInput } from './Number'
export { DEFAULT_REQUIREMENTS, PasswordInput, passwordStrength } from './Password'
export { PinInput } from './Pin'
export { Radio, RadioGroup } from './Radio'
export { Rating } from './Rating'
export { DEFAULT_FONTS, DEFAULT_SIZES, RichTextEditor } from './RichText'
export { SegmentedControl } from './Segmented'
export { Select } from './Select'
export { RangeSlider, Slider } from './Slider'
export { SLUG_MAX, SlugInput, slugify } from './Slug'
export { Sortable, SortableHandle } from './Sortable'
export { Switch } from './Switch'
export { TagInput } from './TagInput'
export { TextArea } from './TextArea'
export { TimeInput } from './Time'

export type { CheckboxGroupProps, CheckboxProps, ChoiceVariant } from './Checkbox/types'
export type { ColorPanelProps, ColorPickerProps, Swatch } from './ColorPicker/types'
export type { CalendarProps } from './Date/Calendar/types'
export type { DatePickerProps, DateRangePickerProps } from './Date/types'
export type { DateRange, ISODate } from './Date/utils'
export type { DateTimePickerProps } from './DateTime/types'
export type { FieldProps, FieldsetProps } from './Field/types'
export type { LabelType } from './Field/Label/types'
export type { FileInputProps } from './File/types'
export type { InputProps } from './Input/types'
export type { NumberInputProps } from './Number/types'
export type { PasswordInputProps, PasswordRequirement } from './Password/types'
export type { PinInputProps } from './Pin/types'
export type { RadioGroupProps, RadioProps } from './Radio/types'
export type { RatingProps } from './Rating/types'
export type { BlockType, FontOption, RichTextEditorProps, RichTextValue } from './RichText/types'
export type { SegmentedControlProps, SegmentedOption } from './Segmented/types'
export type { SelectItems, SelectMode, SelectProps, SelectType } from './Select/types'
export type { RangeSliderProps, SliderMark, SliderProps, SliderType } from './Slider/types'
export type { SlugCheck, SlugInputProps } from './Slug/types'
export type { SortableHandleProps, SortableItemState, SortableProps } from './Sortable/types'
export type { SwitchProps } from './Switch/types'
export type { TagInputProps } from './TagInput/types'
export type { TextAreaProps } from './TextArea/types'
export type { TimeInputProps, TimeInputType } from './Time/types'
export type { ISOTime } from './Time/utils'
export type { ControlSize, Option, OptionGroup, Orientation } from './types'

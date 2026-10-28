import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  Calendar,
  Checkbox,
  CheckboxGroup,
  ColorPicker,
  contrastRatio,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Field,
  FileInput,
  Input,
  NumberInput,
  parseColor,
  parseColorWithAlpha,
  Radio,
  RadioGroup,
  RangeSlider,
  Select,
  Slider,
  Sortable,
  SortableHandle,
  TextArea,
  TimeInput,
  wcagRating,
} from '../app/components/Form'

/** Pretend the screen is wide (640px and up) or phone-sized, for components that lay out by width */
const setScreen = (wide: boolean) => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: wide, addEventListener: jest.fn(), removeEventListener: jest.fn() })
}

const MAJORS = [
  { value: 'cs', label: 'Computer Science' },
  { value: 'bio', label: 'Biology' },
  { value: 'chem', label: 'Chemistry', disabled: true },
  { value: 'econ', label: 'Economics' },
]

describe('Field', () => {
  it('labels its control and links the help text and error', () => {
    render(
      <Field label="Email" description="Use your GSU address" error="Enter an email" required>
        <Input type="email" />
      </Field>
    )
    const input = screen.getByLabelText(/Email/)
    expect(input).toBeRequired()
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Use your GSU address Enter an email')
  })

  it('gives floating labels a blank placeholder to watch', () => {
    render(
      <Field label="Name" labelType="floating">
        <Input />
      </Field>
    )
    expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', ' ')
  })
})

describe('TextArea', () => {
  it('counts characters against maxLength', () => {
    render(
      <Field label="Bio">
        <TextArea maxLength={10} />
      </Field>
    )
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'hello' } })
    expect(screen.getByText('5 / 10')).toBeInTheDocument()
  })
})

describe('NumberInput', () => {
  it('steps with the buttons and stops at max', () => {
    const onValueChange = jest.fn()
    render(
      <Field label="Guests">
        <NumberInput defaultValue={4} max={5} onValueChange={onValueChange} />
      </Field>
    )
    const increase = screen.getByRole('button', { name: 'Increase' })
    fireEvent.click(increase)
    expect(screen.getByLabelText('Guests')).toHaveValue(5)
    expect(onValueChange).toHaveBeenLastCalledWith(5)
    expect(increase).toBeDisabled()
  })

  it('clamps a typed value when leaving the field', () => {
    render(
      <Field label="Guests">
        <NumberInput min={1} max={10} />
      </Field>
    )
    const input = screen.getByLabelText('Guests')
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.blur(input)
    expect(input).toHaveValue(10)
  })
})

describe('CheckboxGroup', () => {
  it('reports the checked values', () => {
    const onValueChange = jest.fn()
    render(
      <CheckboxGroup legend="Interests" defaultValue={['social']} onValueChange={onValueChange}>
        <Checkbox value="social">Socials</Checkbox>
        <Checkbox value="workshops">Workshops</Checkbox>
      </CheckboxGroup>
    )
    expect(screen.getByRole('group', { name: 'Interests' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Workshops'))
    expect(onValueChange).toHaveBeenLastCalledWith(['social', 'workshops'])
    fireEvent.click(screen.getByLabelText('Socials'))
    expect(onValueChange).toHaveBeenLastCalledWith(['workshops'])
  })

  it('shows the indeterminate state', () => {
    render(<Checkbox indeterminate>All</Checkbox>)
    expect(screen.getByLabelText('All')).toBePartiallyChecked()
  })
})

describe('RadioGroup', () => {
  it('picks one choice', () => {
    const onValueChange = jest.fn()
    render(
      <RadioGroup legend="Year" onValueChange={onValueChange}>
        <Radio value="freshman">Freshman</Radio>
        <Radio value="senior">Senior</Radio>
      </RadioGroup>
    )
    fireEvent.click(screen.getByLabelText('Senior'))
    expect(onValueChange).toHaveBeenLastCalledWith('senior')
    expect(screen.getByLabelText('Senior')).toBeChecked()
    expect(screen.getByLabelText('Freshman')).not.toBeChecked()
  })
})

describe('Select', () => {
  it('opens with the arrow keys, skips disabled options, and picks with Enter', () => {
    const onValueChange = jest.fn()
    render(
      <form data-testid="form">
        <Field label="Major">
          <Select name="major" options={MAJORS} onValueChange={onValueChange} />
        </Field>
      </form>
    )
    const trigger = screen.getByRole('combobox', { name: 'Major' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // Opens on the first option; down twice passes Biology and skips disabled Chemistry
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onValueChange).toHaveBeenLastCalledWith('econ')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('Economics')
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('major')).toBe('econ')
  })

  it('jumps to an option by typing its first letters', () => {
    render(<Select aria-label="Major" options={MAJORS} />)
    const trigger = screen.getByRole('combobox', { name: 'Major' })
    fireEvent.keyDown(trigger, { key: 'b' })
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Biology' }).id)
  })

  it('filters as you type in a combobox', () => {
    render(<Select type="combobox" aria-label="Major" options={MAJORS} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Major' }), { target: { value: 'bio' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.change(screen.getByRole('combobox', { name: 'Major' }), { target: { value: 'zzz' } })
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('collects tags and removes the last one with Backspace', () => {
    const onValueChange = jest.fn()
    render(<Select type="tags" aria-label="Majors" options={MAJORS} onValueChange={onValueChange} />)
    const input = screen.getByRole('combobox', { name: 'Majors' })
    fireEvent.change(input, { target: { value: 'comp' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'econ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onValueChange).toHaveBeenLastCalledWith(['cs', 'econ'])
    expect(screen.getByRole('button', { name: 'Remove Economics' })).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onValueChange).toHaveBeenLastCalledWith(['cs'])
  })
})

describe('Slider', () => {
  it('steps with the keys and reads out a formatted value', () => {
    render(
      <Field label="Volume">
        <Slider defaultValue={30} step={5} formatValue={(v) => `${v}%`} />
      </Field>
    )
    const slider = screen.getByRole('slider', { name: 'Volume' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider).toHaveAttribute('aria-valuenow', '35')
    expect(slider).toHaveAttribute('aria-valuetext', '35%')
    fireEvent.keyDown(slider, { key: 'PageUp' })
    expect(slider).toHaveAttribute('aria-valuenow', '45')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('RangeSlider', () => {
  it('keeps the thumbs from crossing and sends both ends', () => {
    const onValueChange = jest.fn()
    render(
      <form data-testid="form">
        <Field label="Price">
          <RangeSlider name="price" defaultValue={[20, 30]} minDistance={5} onValueChange={onValueChange} />
        </Field>
      </form>
    )
    const low = screen.getByRole('slider', { name: 'Price Minimum' })
    const high = screen.getByRole('slider', { name: 'Price Maximum' })
    // The low thumb can only go up to 5 below the high one
    fireEvent.keyDown(low, { key: 'End' })
    expect(low).toHaveAttribute('aria-valuenow', '25')
    expect(high).toHaveAttribute('aria-valuemin', '30')
    fireEvent.keyDown(high, { key: 'ArrowRight' })
    expect(onValueChange).toHaveBeenLastCalledWith([25, 31])
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).getAll('price')).toEqual(['25', '31'])
  })
})

describe('Calendar', () => {
  it('moves by day with the arrow keys and picks with Enter', () => {
    const onValueChange = jest.fn()
    render(<Calendar value="2026-10-27" onValueChange={onValueChange} />)
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument()
    const day = screen.getByRole('button', { name: 'Tuesday, October 27, 2026' })
    expect(day).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(day, { key: 'ArrowRight' })
    const next = screen.getByRole('button', { name: 'Wednesday, October 28, 2026' })
    expect(next).toHaveFocus()
    fireEvent.click(next)
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-28')
  })

  it('turns the month with Page Down and blocks days past max', () => {
    const onValueChange = jest.fn()
    render(<Calendar value="2026-10-27" max="2026-11-15" onValueChange={onValueChange} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Tuesday, October 27, 2026' }), { key: 'PageDown' })
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument()
    const late = screen.getByRole('button', { name: 'Friday, November 27, 2026' })
    expect(late).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(late)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })
})

describe('Calendar views and ranges', () => {
  it('zooms out to months and years, and back in', () => {
    render(<Calendar value="2026-10-27" />)
    fireEvent.click(screen.getByRole('button', { name: /October 2026/ }))
    expect(screen.getByRole('group', { name: 'Months of 2026' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^2026/ }))
    fireEvent.click(screen.getByRole('button', { name: '2027' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mar' }))
    expect(screen.getByRole('grid', { name: 'March 2027' })).toBeInTheDocument()
  })

  it('picks a range in two clicks, in either order', () => {
    const onRangeChange = jest.fn()
    const { rerender } = render(<Calendar mode="range" range={null} onRangeChange={onRangeChange} months={2} />)
    // Opens on today's month; this test needs a fixed one
    rerender(<Calendar mode="range" range={{ start: '2026-10-20', end: null }} onRangeChange={onRangeChange} months={2} />)
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Thursday, October 15, 2026' }))
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: '2026-10-15', end: '2026-10-20' })
  })
})

describe('DateRangePicker', () => {
  it('takes typed ends in either order and sends both', () => {
    const onValueChange = jest.fn()
    render(
      <form data-testid="form">
        <Field label="Trip">
          <DateRangePicker name="trip" onValueChange={onValueChange} />
        </Field>
      </form>
    )
    const start = screen.getByRole('textbox', { name: 'Trip' })
    const end = screen.getByRole('textbox', { name: 'Trip end date' })
    fireEvent.change(start, { target: { value: '11/05/2026' } })
    fireEvent.blur(start)
    // One end alone isn't a range yet, but it stays in its box
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(start).toHaveValue('11/05/2026')
    fireEvent.change(end, { target: { value: '10/30/2026' } })
    fireEvent.blur(end)
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-10-30', end: '2026-11-05' })
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).getAll('trip')).toEqual(['2026-10-30', '2026-11-05'])
  })

  it('opens two months with quick picks and closes once both days are picked', () => {
    // A wide screen, where the panel shows two months
    setScreen(true)
    const onValueChange = jest.fn()
    render(<DateRangePicker defaultValue={{ start: '2026-10-27', end: '2026-10-28' }} onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose dates' }))
    expect(screen.getByRole('group', { name: 'Quick picks' })).toBeInTheDocument()
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getByText(/Oct 27 – 28, 2026 · 2 days/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Monday, November 2, 2026' }))
    expect(screen.getByText('Now pick the last day')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Friday, November 6, 2026' }))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-11-02', end: '2026-11-06' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('DatePicker', () => {
  it('reads typed dates and marks ones it can’t read', () => {
    const onValueChange = jest.fn()
    render(
      <Field label="Event date">
        <DatePicker name="date" onValueChange={onValueChange} />
      </Field>
    )
    const input = screen.getByLabelText('Event date')
    fireEvent.change(input, { target: { value: '10/27/2026' } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-27')
    expect(input).toHaveValue('10/27/2026')
    fireEvent.change(input, { target: { value: '2/30/2026' } })
    fireEvent.blur(input)
    expect(input).toBeInvalid()
  })

  it('opens a calendar and closes it after a pick', () => {
    render(
      <Field label="Event date">
        <DatePicker defaultValue="2026-10-27" />
      </Field>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Friday, October 30, 2026' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Event date')).toHaveValue('10/30/2026')
  })
})

describe('TimeInput', () => {
  it.each([
    ['930a', '09:30'],
    ['9pm', '21:00'],
    ['21:15', '21:15'],
    ['noon', '12:00'],
    ['12:05 am', '00:05'],
  ])('reads "%s" as %s', (typed, expected) => {
    const onValueChange = jest.fn()
    render(
      <Field label="Starts">
        <TimeInput onValueChange={onValueChange} />
      </Field>
    )
    const input = screen.getByLabelText('Starts')
    fireEvent.change(input, { target: { value: typed } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith(expected)
  })

  it('sets the time from the hour, minute, and AM/PM columns', () => {
    const onValueChange = jest.fn()
    render(<TimeInput aria-label="Starts" defaultValue="09:00" step={15} onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose time' }))
    const minutes = screen.getByRole('listbox', { name: 'Min' })
    expect(screen.getByRole('listbox', { name: 'Hour' })).toBeInTheDocument()
    // Down in a column picks the next choice at once
    fireEvent.keyDown(minutes, { key: 'ArrowDown' })
    expect(onValueChange).toHaveBeenLastCalledWith('09:15')
    fireEvent.click(screen.getByRole('option', { name: 'PM' }))
    expect(onValueChange).toHaveBeenLastCalledWith('21:15')
    expect(screen.getByRole('textbox', { name: 'Starts' })).toHaveValue('9:15 PM')
  })

  it('rules out hours past max and uses 24-hour columns where the locale does', () => {
    render(<TimeInput aria-label="Starts" locale="en-GB" max="17:30" defaultValue="17:00" />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose time' }))
    expect(screen.queryByRole('listbox', { name: /AM/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '18' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: '45' })).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('TimeInput type="segments"', () => {
  const renderSegments = (props: Partial<Parameters<typeof TimeInput>[0]> = {}) => {
    const onValueChange = jest.fn()
    render(
      <Field label="Starts">
        <TimeInput type="segments" onValueChange={onValueChange} {...props} />
      </Field>
    )
    const [hours, minutes, period] = ['Starts hours', 'Starts minutes', 'Starts AM or PM'].map((name) => screen.queryByRole('spinbutton', { name }))
    return { onValueChange, hours: hours!, minutes: minutes!, period }
  }

  it('builds an off-step time like 10:07 PM from typed digits', () => {
    const { onValueChange, hours, minutes, period } = renderSegments()
    expect(screen.getByRole('group', { name: 'Starts' })).toBeInTheDocument()
    hours.focus()
    fireEvent.keyDown(hours, { key: '1' })
    fireEvent.keyDown(hours, { key: '0' })
    // Two digits fill the hour and move on to the minutes
    expect(minutes).toHaveFocus()
    fireEvent.keyDown(minutes, { key: '0' })
    fireEvent.keyDown(minutes, { key: '7' })
    expect(period).toHaveFocus()
    // Not reported until every box is filled
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    fireEvent.keyDown(period!, { key: 'p' })
    expect(onValueChange).toHaveBeenLastCalledWith('22:07')
    expect(minutes).toHaveAttribute('aria-valuenow', '7')
  })

  it('steps a minute at a time, with Shift jumping to the next step', () => {
    const { onValueChange, minutes } = renderSegments({ defaultValue: '10:07', step: 15 })
    fireEvent.keyDown(minutes, { key: 'ArrowUp' })
    expect(onValueChange).toHaveBeenLastCalledWith('10:08')
    fireEvent.keyDown(minutes, { key: 'ArrowUp', shiftKey: true })
    expect(onValueChange).toHaveBeenLastCalledWith('10:15')
    fireEvent.keyDown(minutes, { key: 'ArrowDown' })
    fireEvent.keyDown(minutes, { key: 'ArrowDown', shiftKey: true })
    expect(onValueChange).toHaveBeenLastCalledWith('10:00')
    // Minutes wrap without changing the hour
    fireEvent.keyDown(minutes, { key: 'ArrowDown' })
    expect(onValueChange).toHaveBeenLastCalledWith('10:59')
  })

  it('marks a time outside min–max invalid instead of reporting it', () => {
    const { onValueChange, hours } = renderSegments({ defaultValue: '17:00', max: '17:30' })
    fireEvent.keyDown(hours, { key: 'ArrowUp' })
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(hours).toHaveAttribute('aria-invalid', 'true')
    expect(hours).toHaveAttribute('aria-valuenow', '6')
  })

  it('uses hours 0–23 and no AM/PM box on a 24-hour clock', () => {
    const { onValueChange, hours, minutes, period } = renderSegments({ locale: 'en-GB' })
    expect(period).toBeNull()
    fireEvent.keyDown(hours, { key: '2' })
    fireEvent.keyDown(hours, { key: '1' })
    fireEvent.keyDown(minutes, { key: '4' })
    fireEvent.keyDown(minutes, { key: '3' })
    expect(onValueChange).toHaveBeenLastCalledWith('21:43')
  })
})

describe('DateTimePicker', () => {
  it('reports the value once both halves are filled', () => {
    const onValueChange = jest.fn()
    render(
      <Field label="Starts">
        <DateTimePicker onValueChange={onValueChange} />
      </Field>
    )
    // "Starts" names the group, the date, and (with "time") the time
    expect(screen.getByRole('group', { name: 'Starts' })).toBeInTheDocument()
    const date = screen.getByRole('textbox', { name: 'Starts' })
    fireEvent.change(date, { target: { value: '10/27/2026' } })
    fireEvent.blur(date)
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    const time = screen.getByRole('textbox', { name: 'Starts time' })
    fireEvent.change(time, { target: { value: '6:30pm' } })
    fireEvent.blur(time)
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-27T18:30')
  })
})

describe('color helpers', () => {
  it.each([
    ['#03a', '#0033aa'],
    ['0039A6', '#0039a6'],
    ['rgb(0 57 166)', '#0039a6'],
    ['rgba(0, 57, 166, 0.5)', '#0039a6'],
    ['hsl(0 100% 50%)', '#ff0000'],
    ['hsl(120deg, 100%, 25%)', '#008000'],
    ['blue-ish', null],
  ])('reads %s as %s', (text, hex) => {
    expect(parseColor(text)).toBe(hex)
  })

  it('rates contrast the way WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(wcagRating(contrastRatio('#0039a6', '#ffffff'))).toBe('AAA')
    expect(wcagRating(contrastRatio('#767676', '#ffffff'))).toBe('AA')
    expect(wcagRating(contrastRatio('#949494', '#ffffff'))).toBe('AA large')
    expect(wcagRating(contrastRatio('#ffff00', '#ffffff'))).toBe('Fails')
  })
})

describe('ColorPicker', () => {
  beforeEach(() => setScreen(true))

  it('shows the picker and details together, and copies a format', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText, readText: jest.fn().mockResolvedValue('hsl(0 100% 50%)') } })
    const onValueChange = jest.fn()
    render(<ColorPicker aria-label="Color" defaultValue="#0039a6" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    // Both halves at once: the square and the formats
    expect(screen.getByRole('slider', { name: 'Saturation and brightness' })).toBeInTheDocument()
    // Each format as named channel fields
    expect(screen.getByRole('spinbutton', { name: 'Red' })).toHaveValue(0)
    expect(screen.getByRole('spinbutton', { name: 'Green' })).toHaveValue(57)
    expect(screen.getByRole('spinbutton', { name: 'Blue' })).toHaveValue(166)
    expect(screen.getByRole('spinbutton', { name: 'Hue' })).toHaveValue(219)
    expect(screen.getByRole('spinbutton', { name: 'Saturation' })).toHaveValue(100)
    expect(screen.getByRole('spinbutton', { name: 'Lightness' })).toHaveValue(33)
    expect(screen.getAllByText('AAA').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Copy RGB rgb(0 57 166)' }))
    expect(writeText).toHaveBeenCalledWith('rgb(0 57 166)')
    fireEvent.click(screen.getByRole('button', { name: 'Paste a color' }))
    expect(await screen.findByText('Pasted hsl(0 100% 50%)')).toBeInTheDocument()
    expect(onValueChange).toHaveBeenLastCalledWith('#ff0000')
  })

  it('accepts rgb() typed into the box', () => {
    const onValueChange = jest.fn()
    render(<ColorPicker aria-label="Color" onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox', { name: 'Color' })
    fireEvent.change(input, { target: { value: 'rgb(255 0 0)' } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith('#ff0000')
    expect(input).toHaveValue('#FF0000')
  })
})

describe('ColorPicker channels and alpha', () => {
  beforeEach(() => setScreen(true))

  it('edits red, green, and blue, and hue, saturation, and lightness, one number at a time', () => {
    const onValueChange = jest.fn()
    render(<ColorPicker aria-label="Color" defaultValue="#0039a6" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Red' }), { target: { value: '255' } })
    expect(onValueChange).toHaveBeenLastCalledWith('#ff39a6')
    // The other format follows along
    expect(screen.getByRole('spinbutton', { name: 'Hue' })).toHaveValue(327)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Lightness' }), { target: { value: '50' } })
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Lightness' }))
    expect(screen.getByRole('spinbutton', { name: 'Lightness' })).toHaveValue(50)
    // Out of range is left as typed, not applied, until fixed or left
    const green = screen.getByRole('spinbutton', { name: 'Green' })
    const before = onValueChange.mock.calls.length
    fireEvent.change(green, { target: { value: '300' } })
    expect(onValueChange).toHaveBeenCalledTimes(before)
    fireEvent.blur(green)
    expect(green).not.toHaveValue(300)
  })

  it.each([
    ['#0039a6cc', { hex: '#0039a6', alpha: 0.8 }],
    ['#03a8', { hex: '#0033aa', alpha: 0x88 / 255 }],
    ['rgb(0 57 166 / 50%)', { hex: '#0039a6', alpha: 0.5 }],
    ['rgba(0, 57, 166, 0.25)', { hex: '#0039a6', alpha: 0.25 }],
    ['hsl(0 100% 50% / 0.4)', { hex: '#ff0000', alpha: 0.4 }],
    ['#0039a6', { hex: '#0039a6', alpha: 1 }],
  ])('reads %s with its alpha', (text, expected) => {
    const c = parseColorWithAlpha(text)!
    expect(c.hex).toBe(expected.hex)
    expect(c.alpha).toBeCloseTo(expected.alpha, 2)
  })

  it('keeps and reports alpha when it’s on, as 8-digit hex', () => {
    const onValueChange = jest.fn()
    render(
      <form data-testid="form">
        <ColorPicker aria-label="Color" alpha name="overlay" defaultValue="rgb(0 57 166 / 80%)" onValueChange={onValueChange} />
      </form>
    )
    const input = screen.getByRole('textbox', { name: 'Color' })
    expect(input).toHaveValue('#0039A6CC')
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    // An opacity bar under the hue bar, and an Alpha field
    const bar = screen.getByRole('slider', { name: 'Opacity' })
    expect(bar).toHaveAttribute('aria-valuetext', '80%')
    fireEvent.keyDown(bar, { key: 'Home' })
    expect(onValueChange).toHaveBeenLastCalledWith('#0039a600')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Opacity' }), { target: { value: '50' } })
    expect(onValueChange).toHaveBeenLastCalledWith('#0039a680')
    // Formats carry it, and a preset keeps it
    expect(screen.getByRole('button', { name: 'Copy RGB rgb(0 57 166 / 0.5)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Green, #15803D' }))
    expect(onValueChange).toHaveBeenLastCalledWith('#15803d80')
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('overlay')).toBe('#15803d80')
  })

  it('judges a see-through color’s contrast as it shows on each background', () => {
    render(<ColorPicker aria-label="Color" alpha defaultValue="#000000" />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    // Solid black on white: 21:1
    expect(screen.getByText('21:1')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Opacity' }), { target: { value: '20' } })
    // 20% black over white is a pale gray, which fails
    expect(screen.queryByText('21:1')).not.toBeInTheDocument()
    expect(screen.getAllByText('Fails').length).toBeGreaterThan(0)
  })

  it('drops alpha when it’s off, and refuses a fully clear color', () => {
    const onValueChange = jest.fn()
    render(<ColorPicker aria-label="Color" defaultValue="#0039a6" onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox', { name: 'Color' })
    fireEvent.change(input, { target: { value: 'rgb(255 0 0 / 50%)' } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith('#ff0000')
    fireEvent.change(input, { target: { value: '#ff000000' } })
    fireEvent.blur(input)
    expect(input).toBeInvalid()
    expect(screen.queryByRole('slider', { name: 'Opacity' })).not.toBeInTheDocument()
  })
})

describe('ColorPicker on a phone', () => {
  beforeEach(() => setScreen(false))

  it('splits the panel into Pick and Details tabs', () => {
    render(<ColorPicker aria-label="Color" defaultValue="#0039a6" />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    expect(screen.getByRole('tab', { name: 'Pick' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('slider', { name: 'Saturation and brightness' })).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Red' })).not.toBeInTheDocument()
    // Arrow keys move between tabs
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pick' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('spinbutton', { name: 'Green' })).toHaveValue(57)
    expect(screen.queryByRole('slider', { name: 'Saturation and brightness' })).not.toBeInTheDocument()
  })
})

describe('ColorPicker (basics)', () => {
  beforeEach(() => setScreen(true))

  it('takes a typed hex code, and keeps one it can’t read marked invalid until Escape', () => {
    const onValueChange = jest.fn()
    render(
      <Field label="Color">
        <ColorPicker defaultValue="#0039a6" onValueChange={onValueChange} />
      </Field>
    )
    const input = screen.getByLabelText('Color')
    fireEvent.change(input, { target: { value: 'f00' } })
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith('#ff0000')
    expect(input).toBeValid()
    fireEvent.change(input, { target: { value: '#12345' } })
    fireEvent.blur(input)
    // Left as typed so it can be fixed, not silently swapped back
    expect(input).toHaveValue('#12345')
    expect(input).toBeInvalid()
    expect(onValueChange).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('#FF0000')
    expect(input).toBeValid()
  })

  it('reads any supported format passed in as the value', () => {
    render(<ColorPicker aria-label="Color" value="rgb(0 57 166)" />)
    expect(screen.getByRole('textbox', { name: 'Color' })).toHaveValue('#0039A6')
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    // The square works from the real color, not black
    expect(screen.getByRole('slider', { name: 'Saturation and brightness' })).toHaveAttribute('aria-valuetext', 'Saturation 100%, brightness 65%')
  })

  it('changes brightness with the arrow keys and picks named presets', () => {
    const onValueChange = jest.fn()
    render(<ColorPicker aria-label="Color" defaultValue="#ffffff" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation and brightness' }), { key: 'ArrowDown', shiftKey: true })
    expect(onValueChange).toHaveBeenLastCalledWith('#e6e6e6')
    fireEvent.click(screen.getByRole('button', { name: 'Green, #15803D' }))
    expect(onValueChange).toHaveBeenLastCalledWith('#15803d')
    expect(screen.getByRole('button', { name: 'Green, #15803D' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'GSU blue, #0039A6' })).toHaveAttribute('title', 'GSU blue')
  })

  it('takes custom presets, named or not', () => {
    render(<ColorPicker aria-label="Color" swatches={['#ff0000', { color: 'rgb(0 128 0)', name: 'Lawn' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }))
    expect(screen.getByRole('button', { name: '#FF0000' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lawn, #008000' })).toBeInTheDocument()
  })
})

describe('Sortable', () => {
  const OFFICERS = [
    { id: 'ana', name: 'Ana' },
    { id: 'ben', name: 'Ben' },
    { id: 'cy', name: 'Cy' },
  ]
  const renderList = (onItemsChange = jest.fn()) => {
    render(
      <form data-testid="form">
        <Sortable
          aria-label="Officers"
          name="order"
          defaultItems={OFFICERS}
          getKey={(o) => o.id}
          getLabel={(o) => o.name}
          onItemsChange={onItemsChange}
          renderItem={(o, { handleProps }) => (
            <div>
              <SortableHandle {...handleProps} />
              {o.name}
            </div>
          )}
        />
      </form>
    )
    return onItemsChange
  }
  const order = () => new FormData(screen.getByTestId('form') as HTMLFormElement).getAll('order')

  it('moves an item with the keyboard', () => {
    renderList()
    const handle = screen.getByRole('button', { name: 'Reorder Ana' })
    handle.focus()
    fireEvent.keyDown(handle, { key: ' ' })
    expect(handle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder Ana' }), { key: 'ArrowDown' })
    expect(order()).toEqual(['ben', 'cy', 'ana'])
    expect(screen.getByRole('button', { name: 'Reorder Ana' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder Ana' }), { key: ' ' })
    expect(screen.getByText(/Ana dropped at position 3 of 3/)).toBeInTheDocument()
  })

  it('puts the item back on Escape', () => {
    const onItemsChange = renderList()
    const handle = screen.getByRole('button', { name: 'Reorder Cy' })
    handle.focus()
    fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder Cy' }), { key: 'Escape' })
    expect(order()).toEqual(['ana', 'ben', 'cy'])
    expect(onItemsChange).toHaveBeenLastCalledWith(OFFICERS)
  })
})

describe('FileInput', () => {
  it('lists chosen files and turns away ones that are too big', () => {
    const onFilesChange = jest.fn()
    render(
      <Field label="Résumé">
        <FileInput multiple maxSize={1024} onFilesChange={onFilesChange} />
      </Field>
    )
    const small = new File(['hi'], 'resume.pdf', { type: 'application/pdf' })
    const big = new File([new Uint8Array(4096)], 'scan.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Résumé'), { target: { files: [small, big] } })
    expect(onFilesChange).toHaveBeenLastCalledWith([small])
    expect(screen.getByRole('alert')).toHaveTextContent('scan.pdf is over 1 KB.')
    fireEvent.click(screen.getByRole('button', { name: 'Remove resume.pdf' }))
    expect(onFilesChange).toHaveBeenLastCalledWith([])
  })
})

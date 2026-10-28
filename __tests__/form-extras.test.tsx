import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import { DEFAULT_REQUIREMENTS, Field, PasswordInput, passwordStrength, PinInput, Rating, SegmentedControl, Slider, Switch, TagInput } from '@/components/Form'

describe('Switch', () => {
  it('is a switch named by its label that toggles', () => {
    const onChange = jest.fn()
    render(<Switch onCheckedChange={onChange}>Email me</Switch>)
    const sw = screen.getByRole('switch', { name: 'Email me' })
    expect(sw).not.toBeChecked()
    fireEvent.click(sw)
    expect(sw).toBeChecked()
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('SegmentedControl', () => {
  it('is a radio group named by its Field, picking the first option to start', () => {
    const onChange = jest.fn()
    render(
      <Field label="View">
        <SegmentedControl onValueChange={onChange} options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} />
      </Field>
    )
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }))
    expect(onChange).toHaveBeenCalledWith('grid')
  })
})

describe('Field ids on groups', () => {
  it('go on the radio group, not its first radio (whose label would be replaced)', () => {
    render(
      <>
        <Field label="View" id="view">
          <SegmentedControl options={[{ value: 'a', label: 'A' }]} />
        </Field>
        <Field label="Stars" id="stars">
          <Rating />
        </Field>
      </>
    )
    expect(document.getElementById('view')).toHaveAttribute('role', 'radiogroup')
    expect(document.getElementById('stars')).toHaveAttribute('role', 'radiogroup')
    expect(screen.getByRole('radio', { name: 'A' })).not.toHaveAttribute('id')
  })
})

describe('PasswordInput', () => {
  it('shows and hides the password', () => {
    render(
      <Field label="Password">
        <PasswordInput />
      </Field>
    )
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ticks off requirements and rates strength as it’s typed', () => {
    render(
      <Field label="New password">
        <PasswordInput strength requirements={DEFAULT_REQUIREMENTS} />
      </Field>
    )
    const input = screen.getByLabelText('New password')
    fireEvent.change(input, { target: { value: 'Tr0mbone-Harbor-77' } })
    expect(screen.getByText('At least 12 characters').parentElement).toHaveTextContent('Met:')
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(passwordStrength('password123')).toBeLessThanOrEqual(1)
    expect(passwordStrength('')).toBe(0)
  })
})

describe('PinInput', () => {
  it('keeps only digits, and reports the code once full', () => {
    const onComplete = jest.fn()
    render(
      <Field label="Code">
        <PinInput length={4} onComplete={onComplete} />
      </Field>
    )
    const input = screen.getByLabelText('Code')
    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    fireEvent.change(input, { target: { value: '1a2-3' } })
    expect(input).toHaveValue('123')
    fireEvent.change(input, { target: { value: '12345' } })
    expect(input).toHaveValue('1234')
    expect(onComplete).toHaveBeenCalledWith('1234')
  })
})

describe('Rating', () => {
  it('rates with radio buttons and clears when the same star is picked again', () => {
    const onChange = jest.fn()
    render(<Rating defaultValue={3} onValueChange={onChange} />)
    expect(screen.getByRole('radiogroup', { name: 'Rating' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(onChange).toHaveBeenLastCalledWith(4)
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('reads a read-only rating in words', () => {
    render(<Rating readOnly value={4.5} />)
    expect(screen.getByRole('img', { name: '4.5 out of 5 stars' })).toBeInTheDocument()
  })
})

describe('TagInput', () => {
  it('adds on Enter and comma, skips repeats, turns away invalid ones, and removes', () => {
    const onChange = jest.fn()
    render(
      <Field label="Emails">
        <TagInput onValueChange={onChange} validate={(t) => (t.includes('@') ? undefined : 'Needs an @')} />
      </Field>
    )
    const input = screen.getByLabelText('Emails')
    fireEvent.change(input, { target: { value: 'a@gsu.edu' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'b@gsu.edu,' } })
    expect(onChange).toHaveBeenLastCalledWith(['a@gsu.edu', 'b@gsu.edu'])
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Needs an @')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Remove a@gsu.edu' }))
    expect(onChange).toHaveBeenLastCalledWith(['b@gsu.edu'])
  })

  it('removes the last tag with Backspace in the empty box', () => {
    const onChange = jest.fn()
    render(<TagInput aria-label="Tags" defaultValue={['one', 'two']} onValueChange={onChange} />)
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Backspace' })
    expect(onChange).toHaveBeenLastCalledWith(['one'])
  })
})

describe('Slider marks', () => {
  const marks = [
    { value: 1, label: 'Poor' },
    { value: 3, label: 'OK' },
    { value: 5, label: 'Great' },
  ]

  it('reads the mark’s label at that value, and jumps there when a label is pressed', () => {
    render(
      <Field label="Rating">
        <Slider min={1} max={5} defaultValue={3} marks={marks} />
      </Field>
    )
    const thumb = screen.getByRole('slider', { name: 'Rating' })
    expect(thumb).toHaveAttribute('aria-valuetext', 'OK')
    fireEvent.pointerDown(screen.getByText('Great'), { button: 0 })
    expect(thumb).toHaveAttribute('aria-valuenow', '5')
    expect(thumb).toHaveAttribute('aria-valuetext', 'Great')
    fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
    // Between marks: no label to read, so just the number
    expect(thumb).toHaveAttribute('aria-valuenow', '4')
    expect(thumb).not.toHaveAttribute('aria-valuetext')
  })

  it('moves mark to mark with snapToMarks', () => {
    const onChange = jest.fn()
    render(<Slider aria-label="Price" min={0} max={50} defaultValue={10} snapToMarks marks={[0, 5, 10, 20, 50]} onValueChange={onChange} />)
    const thumb = screen.getByRole('slider', { name: 'Price' })
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith(20)
    fireEvent.keyDown(thumb, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith(50)
    fireEvent.keyDown(thumb, { key: 'PageDown' })
    expect(onChange).toHaveBeenLastCalledWith(20)
  })
})

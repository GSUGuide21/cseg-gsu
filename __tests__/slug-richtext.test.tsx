import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { Field, RichTextEditor, SlugInput, slugify, type RichTextValue } from '@/components/Form'

describe('slugify', () => {
  it('keeps letters, numbers, and single hyphens', () => {
    expect(slugify('Fall Social 2026!')).toBe('fall-social-2026')
    expect(slugify('Café — Résumé Night')).toBe('cafe-resume-night')
    expect(slugify('fall-', { trailing: true })).toBe('fall-')
    expect(slugify('x'.repeat(200))).toHaveLength(80)
  })
})

describe('SlugInput', () => {
  const Harness = ({ check }: { check?: (s: string) => Promise<{ ok: true } | { ok: false; message: string }> }) => {
    const [title, setTitle] = useState('Welcome Week')
    const [slug, setSlug] = useState('')
    return (
      <>
        <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label="Web address">
          <SlugInput value={slug} onValueChange={setSlug} source={title} prefix="/posts/" checkAvailability={check} />
        </Field>
        <output data-testid="slug">{slug}</output>
      </>
    )
  }

  it('follows the title until edited, then offers to follow it again', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Web address')
    expect(input).toHaveValue('welcome-week')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Fall Social' } })
    expect(input).toHaveValue('fall-social')
    expect(screen.getByTestId('slug')).toHaveTextContent('fall-social')

    fireEvent.change(input, { target: { value: 'My Party!!' } })
    expect(input).toHaveValue('my-party-')
    fireEvent.blur(input)
    expect(input).toHaveValue('my-party')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Something else' } })
    expect(input).toHaveValue('my-party')

    fireEvent.click(screen.getByRole('button', { name: 'Use the title' }))
    expect(input).toHaveValue('something-else')
  })

  it('asks whether it’s free once typing pauses', async () => {
    jest.useFakeTimers()
    const check = jest.fn(async (s: string) => (s === 'welcome-week' ? { ok: false as const, message: 'Already used.' } : { ok: true as const }))
    render(<Harness check={check} />)
    await act(async () => {
      jest.advanceTimersByTime(500)
    })
    jest.useRealTimers()
    await waitFor(() => expect(screen.getByText('Already used.')).toBeInTheDocument())
    expect(check).toHaveBeenCalledWith('welcome-week')
    expect(screen.getByLabelText('Web address')).toHaveAttribute('aria-invalid', 'true')
  })

  it('takes a deliberate Change when it’s live, and is still sent with the form', () => {
    render(
      <form data-testid="form">
        <SlugInput name="slug" defaultValue="spring-gala" locked />
      </form>
    )
    const input = screen.getByRole('textbox', { name: 'Web address' })
    expect(input).toHaveAttribute('readonly')
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('slug')).toBe('spring-gala')
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(input).not.toHaveAttribute('readonly')
    expect(screen.getByText(/changing it breaks links/)).toBeInTheDocument()
  })
})

describe('RichTextEditor', () => {
  it('starts from HTML, reports JSON, HTML, and text, and sends them with the form', async () => {
    let last: RichTextValue | null = null
    const { container } = render(
      <form>
        <Field label="Announcement">
          <RichTextEditor name="body" htmlName="body_html" defaultValue="<h2>Fall Social</h2><p>Join us <b>Thursday</b>.</p>" onChange={(v) => (last = v)} />
        </Field>
      </form>
    )
    const editor = screen.getByRole('textbox', { name: 'Announcement' })
    await waitFor(() => expect(editor).toHaveTextContent('Fall SocialJoin us Thursday.'))
    expect(editor.querySelector('h2')).toHaveTextContent('Fall Social')
    expect(editor.querySelector('strong')).toHaveTextContent('Thursday')

    // The starting content is reported (and in the form's fields) before anyone edits it
    await waitFor(() => expect(last).not.toBeNull())
    expect(last!.text).toContain('Join us Thursday.')
    expect(last!.html).toMatch(/<h2[^>]*>.*Fall Social/)
    expect(JSON.parse(last!.json).root.children[0].type).toBe('heading')
    const hidden = container.querySelector<HTMLInputElement>('input[name="body"]')!
    expect(JSON.parse(hidden.value).root.type).toBe('root')
    expect(container.querySelector<HTMLInputElement>('input[name="body_html"]')!.value).toContain('Thursday')
  })

  it('has a labeled toolbar with one Tab stop, and no toolbar when read-only', () => {
    const { unmount } = render(<RichTextEditor aria-label="Notes" />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(toolbar.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Block type: Paragraph/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insert a table' })).toBeInTheDocument()
    unmount()
    render(<RichTextEditor readOnly defaultValue="<p>Hi</p>" aria-label="Preview" />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Preview' })).toHaveAttribute('contenteditable', 'false')
  })
})

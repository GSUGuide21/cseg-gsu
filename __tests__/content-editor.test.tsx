import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { NotificationProvider } from '../app/components'
import * as actions from '../app/lib/content/actions'
import type { PollRow } from '../app/lib/content/types'
import { PollsView } from '../app/(dashboard)/dashboard/content/views'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }), usePathname: () => '/dashboard/polls' }))
jest.mock('../app/lib/content/actions', () => ({
  saveContent: jest.fn(async () => ({ ok: true, id: 'p1', message: 'Saved' })),
  deleteContent: jest.fn(async () => ({ ok: true })),
  importBuiltInTours: jest.fn(),
}))
jest.mock('../app/lib/dashboard/media', () => ({ FILE_ACCEPT: '.pdf', uploadFile: jest.fn(), uploadImage: jest.fn(), listImages: jest.fn(async () => []) }))

const stamps = { created_at: '2026-11-14T15:00:00Z', updated_at: '2026-11-14T15:00:00Z' }
const QUIZ: PollRow & { correct: Record<string, string>; responses: number } = {
  ...stamps,
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'campus-trivia',
  kind: 'quiz',
  title: 'Campus trivia',
  description: null,
  published: false,
  closes_at: null,
  results_public: true,
  responses: 0,
  questions: [{ id: 'marta', text: 'Which line?', options: ['Red and Gold', 'Blue and Green'] }],
  correct: { marta: 'Blue and Green' },
}

const openEditor = async () => {
  render(
    <NotificationProvider>
      <PollsView rows={[QUIZ]} />
    </NotificationProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Campus trivia' }))
  await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' })))
  return within(within(screen.getByRole('dialog')).getByRole('group', { name: 'question 1' }))
}
const sent = () => JSON.parse(((jest.mocked(actions.saveContent).mock.calls[0] as unknown[])[2] as FormData).get('questions') as string) as { options: string[]; correct: string }[]
const save = () => act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })))

describe('A question’s options, in the editor', () => {
  beforeEach(() => jest.clearAllMocks())

  it('has a box for each option, with the right answer marked', async () => {
    const question = await openEditor()
    expect(question.getByRole('textbox', { name: 'Option 1' })).toHaveValue('Red and Gold')
    expect(question.getByRole('textbox', { name: 'Option 2' })).toHaveValue('Blue and Green')
    expect(question.getByRole('radio', { name: 'Option 2 is the right answer' })).toBeChecked()
    expect(question.getByRole('radio', { name: 'Option 1 is the right answer' })).not.toBeChecked()
    // Two is the fewest a question can have
    expect(question.getByRole('button', { name: 'Remove option 1' })).toBeDisabled()
  })

  it('adds an option from the button or with Enter, and takes one out', async () => {
    const question = await openEditor()
    fireEvent.click(question.getByRole('button', { name: 'Add an option' }))
    fireEvent.change(question.getByRole('textbox', { name: 'Option 3' }), { target: { value: 'Streetcar' } })
    // Enter adds the next one instead of saving the whole thing
    fireEvent.keyDown(question.getByRole('textbox', { name: 'Option 1' }), { key: 'Enter' })
    expect(actions.saveContent).not.toHaveBeenCalled()
    expect(question.getAllByRole('textbox', { name: /^Option \d$/ })).toHaveLength(4)
    expect(question.getByRole('textbox', { name: 'Option 2' })).toHaveValue('')
    fireEvent.click(question.getByRole('button', { name: 'Remove option 2' }))
    await save()
    expect(sent()[0]).toMatchObject({ options: ['Red and Gold', 'Blue and Green', 'Streetcar'], correct: 'Blue and Green' })
  })

  it('keeps the right answer with its option when the wording changes, and drops it when that option goes', async () => {
    const question = await openEditor()
    fireEvent.change(question.getByRole('textbox', { name: 'Option 2' }), { target: { value: 'Blue and Green lines' } })
    expect(question.getByRole('radio', { name: 'Option 2 is the right answer' })).toBeChecked()
    fireEvent.click(question.getByRole('button', { name: 'Add an option' }))
    fireEvent.change(question.getByRole('textbox', { name: 'Option 3' }), { target: { value: 'Streetcar' } })
    fireEvent.click(question.getByRole('button', { name: 'Remove option 2' }))
    expect(question.queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    fireEvent.click(question.getByRole('radio', { name: 'Option 2 is the right answer' }))
    await save()
    expect(sent()[0]).toMatchObject({ options: ['Red and Gold', 'Streetcar'], correct: 'Streetcar' })
  })

  it('doesn’t ask for a right answer on a poll', async () => {
    const question = await openEditor()
    // Kind is a menu in the dialog: switch the quiz to a poll
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.click(dialog.getByRole('combobox', { name: 'Kind' }))
    await act(async () => fireEvent.click(screen.getByRole('option', { name: /^Poll/ })))
    expect(question.queryByRole('radio')).not.toBeInTheDocument()
    expect(question.getByRole('textbox', { name: 'Option 1' })).toHaveValue('Red and Gold')
  })
})

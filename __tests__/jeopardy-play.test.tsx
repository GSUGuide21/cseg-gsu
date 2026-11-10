import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'

import Game from '../app/(jeopardy)/jeopardy/game/Game'

const KEY = 'jeopardy-game-state-v1'

const teams = [
  { id: 'a', name: 'Panthers', score: 0, color: 'red' },
  { id: 'b', name: 'Owls', score: 0, color: 'blue' },
]

/** A game with two teams, as if it had been saved; the board fills in from the sample rounds */
const start = (saved: Record<string, unknown> = {}) => {
  localStorage.setItem(KEY, JSON.stringify({ round: 'single', teams, ...saved }))
  return render(<Game />)
}

const tile = (category: string, value: number) => within(screen.getByRole('navigation', { name: category })).getByRole('button', { name: `$${value}` })
const teamCard = (name: string) => within(screen.getByRole('dialog', { name: 'Answer' })).getByText(name).parentElement as HTMLElement
/** Shows the answer, and waits for its screen (and the teams on it) to flip in */
const showAnswer = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }))
  await within(screen.getByRole('dialog', { name: 'Answer' })).findByText(teams[0].name)
}
/**
 * The clue's closed: no tile is still picked. (The clue screen shrinks back into its tile
 * by shared layout, which jsdom can't measure, so the screen itself lingers in tests.)
 */
const closed = () => waitFor(() => expect(screen.getAllByRole('button', { name: /^\$\d+$/ }).filter((b) => b.hasAttribute('disabled'))).toEqual([]))
const scoreOf = (name: string) => within(screen.getByRole('list', { name: 'Scores' })).getByText(name).parentElement!.textContent

// The game's animations, done at once: what's shown is what's there
MotionGlobalConfig.skipAnimations = true

beforeEach(() => {
  localStorage.clear()
  jest.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('playing a clue', () => {
  it('lets another team try after a wrong answer, then ends it on a right one', async () => {
    start()
    fireEvent.click(tile('Literature', 200))
    await showAnswer()

    fireEvent.click(within(teamCard('Panthers')).getByRole('button', { name: /Wrong/ }))
    expect(screen.getByRole('dialog', { name: 'Answer' })).toBeInTheDocument()
    expect(within(teamCard('Panthers')).getByRole('button', { name: /Right/ })).toBeDisabled()
    expect(within(teamCard('Panthers')).getByText('Missed it')).toBeInTheDocument()

    fireEvent.click(within(teamCard('Owls')).getByRole('button', { name: /Right/ }))
    await closed()
    expect(scoreOf('Panthers')).toContain('−$200')
    expect(scoreOf('Owls')).toContain('$200')
    expect(within(screen.getByRole('navigation', { name: 'Literature' })).getAllByRole('button', { name: 'Already played' })).toHaveLength(1)
  })

  it('puts a clue back when it’s closed with Esc', async () => {
    start()
    fireEvent.click(tile('Science', 100))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await closed()
    expect(tile('Science', 100)).toBeEnabled()
  })

  it('reopens a clue that was open when the page was refreshed, keys and all', async () => {
    start({ selectedClue: { id: 'sci-100', value: 100, question: { text: 'Planet known as the Red Planet' }, answer: 'Mars', categoryId: 'sci' } })
    const dialog = screen.getByRole('dialog', { name: 'Clue' })
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: 'Answer' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await closed()
  })
})

describe('a Daily Double', () => {
  it('holds the board through its announcement, and lets a team at $0 wager up to the top value', async () => {
    jest.useFakeTimers()
    start()
    fireEvent.click(tile('Food & Drink', 400))
    // Another pick during the announcement goes nowhere
    fireEvent.click(tile('Art', 100))
    act(() => jest.advanceTimersByTime(3000))
    jest.useRealTimers()

    const dialog = screen.getByRole('dialog', { name: 'Clue' })
    expect(dialog).toHaveTextContent(/baklava/i)
    await showAnswer()
    expect(within(teamCard('Panthers')).getByText('Wager (up to $500)')).toBeInTheDocument()
    const wager = within(teamCard('Panthers')).getByRole('spinbutton')
    fireEvent.change(wager, { target: { value: '9999' } })
    expect(wager).toHaveValue(500)
    fireEvent.click(within(teamCard('Panthers')).getByRole('button', { name: /Right/ }))
    expect(scoreOf('Panthers')).toContain('$500')
  })
})

describe('the host menu', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /Fix/ }))

  it('takes back the last score change', async () => {
    start()
    fireEvent.click(tile('History', 300))
    await showAnswer()
    fireEvent.click(within(teamCard('Owls')).getByRole('button', { name: /Right/ }))
    expect(scoreOf('Owls')).toContain('$300')

    openMenu()
    const menu = screen.getByRole('dialog', { name: 'Fix the game' })
    fireEvent.click(within(menu).getByRole('button', { name: 'Undo +$300 to Owls' }))
    expect(scoreOf('Owls')).toContain('$0')
    expect(within(menu).getByRole('button', { name: 'Nothing to undo' })).toBeDisabled()
  })

  it('sets a score exactly, and that can be undone too', async () => {
    start()
    openMenu()
    const field = screen.getByLabelText(/Panthers/)
    fireEvent.change(field, { target: { value: '1200' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(scoreOf('Panthers')).toContain('$1,200')
    fireEvent.click(screen.getByRole('button', { name: 'Undo Panthers set to $1,200' }))
    expect(scoreOf('Panthers')).toContain('$0')
  })

  it('puts a played tile back on the board, and takes one off', async () => {
    start()
    openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Sports, $500: not played; take it off' }))
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Fix the game' }), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fix the game' })).not.toBeInTheDocument())
    expect(within(screen.getByRole('navigation', { name: 'Sports' })).getByRole('button', { name: 'Already played' })).toBeDisabled()

    openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Sports, $500: played; put it back' }))
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Fix the game' }), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fix the game' })).not.toBeInTheDocument())
    expect(tile('Sports', 500)).toBeEnabled()
  })

  it('jumps to another round, keeping the scores', async () => {
    start({ teams: [{ ...teams[0], score: 700 }, teams[1]] })
    openMenu()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fix the game' })).getByRole('button', { name: 'Double Jeopardy' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fix the game' })).not.toBeInTheDocument())
    expect(screen.getByRole('navigation', { name: 'Geography' })).toBeInTheDocument()
    expect(scoreOf('Panthers')).toContain('$700')
  })
})

import '@testing-library/jest-dom'
import { act, render, renderHook, screen } from '@testing-library/react'

import { useLocalStorage } from '@/hooks/useLocalStorage'

import JeopardyLayout from '../app/(jeopardy)/layout'
import JeopardyPage from '../app/(jeopardy)/jeopardy/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  // As Next's own: throws, which the router turns into the 404 page
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const KEY = 'jeopardy-game-state-v1'

beforeEach(() => localStorage.clear())

describe('Jeopardy', () => {
  it('starts a game from the title screen', () => {
    render(<JeopardyPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Jeopardy!' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a game' })).toHaveAttribute('href', '/jeopardy/game')
    expect(screen.queryByRole('link', { name: 'Continue game' })).not.toBeInTheDocument()
  })

  it('offers to continue a game in progress, or start over', () => {
    localStorage.setItem(KEY, JSON.stringify({ round: 'double' }))
    render(<JeopardyPage />)
    expect(screen.getByRole('link', { name: 'Continue game' })).toHaveAttribute('href', '/jeopardy/game')
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument()
  })
})

describe('useLocalStorage', () => {
  it('saves an object and reads the same object back, in every component using the key', () => {
    const a = renderHook(() => useLocalStorage<{ round: string } | null>(KEY, null))
    const b = renderHook(() => useLocalStorage<{ round: string } | null>(KEY, null))
    expect(a.result.current[0]).toBeNull()
    act(() => a.result.current[1]({ round: 'final' }))
    expect(a.result.current[0]).toEqual({ round: 'final' })
    expect(b.result.current[0]).toEqual({ round: 'final' })
    // Stored once as JSON, not a JSON string inside JSON
    expect(localStorage.getItem(KEY)).toBe('{"round":"final"}')
    act(() => a.result.current[1](null))
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(b.result.current[0]).toBeNull()
  })

  it('falls back to the initial value when what’s saved isn’t JSON', () => {
    localStorage.setItem(KEY, 'not json')
    const { result } = renderHook(() => useLocalStorage(KEY, 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })
})

describe('only in development', () => {
  it('answers 404 on the live site, and plays under next dev', () => {
    // The live site's build runs as production
    jest.replaceProperty(process.env, 'NODE_ENV', 'production')
    expect(() => JeopardyLayout({ children: 'game' })).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
    jest.replaceProperty(process.env, 'NODE_ENV', 'development')
    expect(JeopardyLayout({ children: 'game' })).toBe('game')
  })
})

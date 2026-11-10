'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

/** Where the game keeps its progress (GameProvider's STORAGE_KEY) */
const STORAGE_KEY = 'jeopardy-game-state-v1'

const hasSavedGame = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const button =
  'inline-flex min-w-48 items-center justify-center rounded-lg px-6 py-3 text-lg font-bold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d69f4c]'

/** Continue a game in progress on this computer, or start a fresh one */
export function StartButtons() {
  const router = useRouter()
  // Checked in the browser; the server has no saved game to know of
  const saved = useSyncExternalStore(
    () => () => {},
    hasSavedGame,
    () => false
  )
  const startOver = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing saved after all
    }
    router.push('/jeopardy/game')
  }
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {saved ? (
        <>
          <Link href="/jeopardy/game" className={`${button} bg-[#d69f4c] text-[#071277] hover:bg-[#e8b766]`}>
            Continue game
          </Link>
          <button type="button" onClick={startOver} className={`${button} cursor-pointer border-2 border-[#d69f4c] text-[#d69f4c] hover:bg-[#d69f4c]/15`}>
            New game
          </button>
        </>
      ) : (
        <Link href="/jeopardy/game" className={`${button} bg-[#d69f4c] text-[#071277] hover:bg-[#e8b766]`}>
          Start a game
        </Link>
      )}
    </div>
  )
}

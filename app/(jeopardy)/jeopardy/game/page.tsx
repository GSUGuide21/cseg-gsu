'use client'
import dynamic from 'next/dynamic'

// Browser only: the game picks up where it left off from localStorage, which the server
// doesn't have, so drawing it there would only show a fresh board that then jumps
const Game = dynamic(() => import('./Game'), {
  ssr: false,
  loading: () => <div className="grid h-screen w-screen place-items-center bg-black text-[#d69f4c]">Loading the board…</div>,
})

export default function GamePage() {
  return <Game />
}

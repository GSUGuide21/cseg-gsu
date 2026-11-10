'use client'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, EyeOff, Maximize, Minimize, RotateCcw, Users, Wrench } from 'lucide-react'
import { useGame } from './Context'
import { cn } from '@/lib/cn'
import { money } from './ui'

const ROUND_TITLES = { single: 'Jeopardy', double: 'Double Jeopardy', final: 'Final Jeopardy' } as const

const barButton =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d69f4c] disabled:cursor-not-allowed disabled:opacity-40'

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="ml-1 rounded border border-white/25 px-1 font-sans text-[0.7rem] leading-4 text-white/60">{children}</kbd>
)

/** A team's score; when it changes, the new number drops in and flashes green or red */
const Score: React.FC<{ score: number; currency: string }> = ({ score, currency }) => {
  const [last, setLast] = useState(score)
  const [change, setChange] = useState<'up' | 'down' | null>(null)
  if (score !== last) {
    setChange(score > last ? 'up' : 'down')
    setLast(score)
  }
  useEffect(() => {
    if (!change) return
    const t = setTimeout(() => setChange(null), 900)
    return () => clearTimeout(t)
  }, [change, score])
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={score}
          initial={{ y: change === 'down' ? '100%' : '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: change === 'down' ? '-100%' : '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'font-bold transition-colors duration-700',
            change === 'up' ? 'text-green-300' : change === 'down' ? 'text-red-300' : score < 0 ? 'text-red-300' : 'text-[#d69f4c]'
          )}>
          {money(score, currency)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * The host's bar along the top: the round and how much of it is left, every team's score
 * (always in view), and the controls. H hides it for a clean board, and brings it back.
 */
export const HostBar: React.FC<{
  onNextRound: () => void
  teamsOpen: boolean
  onToggleTeams: () => void
  onOpenMenu: () => void
  onHide: () => void
}> = ({ onNextRound, teamsOpen, onToggleTeams, onOpenMenu, onHide }) => {
  const { round, teams, categories, currency, resetGame } = useGame()
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement)
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const total = categories.reduce((n, c) => n + c.clues.length, 0)
  const left = categories.reduce((n, c) => n + c.clues.filter((clue) => !clue.revealed).length, 0)
  const next = round === 'single' ? 'Double Jeopardy' : round === 'double' ? 'Final Jeopardy' : null

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Host controls"
      className="relative z-40 flex w-full shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#d69f4c]/30 bg-black/85 px-4 py-2 text-white backdrop-blur-sm">
      {/* Where the game is */}
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-bold text-[#d69f4c]">{ROUND_TITLES[round]}</span>
        {round !== 'final' && total ? <span className="text-sm text-white/60 tabular-nums">{left} of {total} left</span> : null}
      </div>

      {/* The scores, always in view */}
      <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap items-center justify-center gap-2 p-0" aria-label="Scores">
        {teams.length ? (
          teams.map((team) => (
            <li key={team.id} className="flex items-baseline gap-2 rounded-full bg-white/8 px-3 py-1">
              <span className="max-w-[12ch] truncate text-sm text-white/85">{team.name}</span>
              <Score score={team.score} currency={currency} />
            </li>
          ))
        ) : (
          <li>
            <button type="button" onClick={onToggleTeams} className={cn(barButton, 'bg-[#d69f4c] text-[#071277] hover:bg-[#e8b766]')}>
              <Users className="size-4" aria-hidden />
              Add teams to start
            </button>
          </li>
        )}
      </ul>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onToggleTeams} aria-pressed={teamsOpen} className={cn(barButton, teamsOpen ? 'bg-white/20' : 'hover:bg-white/10')}>
          <Users className="size-4" aria-hidden />
          Teams
        </button>
        {next ? (
          <button
            type="button"
            onClick={onNextRound}
            disabled={!teams.length}
            title={teams.length ? `Go to ${next} (Shift+N)` : 'Add a team first'}
            className={cn(barButton, 'bg-[#071277] hover:bg-[#0a1a99]')}>
            {next}
            <ChevronRight className="size-4" aria-hidden />
          </button>
        ) : null}
        <button type="button" onClick={onOpenMenu} title="Fix a score, a tile, or the round (M)" className={cn(barButton, 'hover:bg-white/10')}>
          <Wrench className="size-4" aria-hidden />
          Fix
          <Kbd>M</Kbd>
        </button>
        <button type="button" onClick={toggleFullscreen} title={fullscreen ? 'Leave full screen' : 'Full screen, for the projector'} className={cn(barButton, 'hover:bg-white/10')}>
          {fullscreen ? <Minimize className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
          <span className="sr-only">{fullscreen ? 'Leave full screen' : 'Full screen'}</span>
        </button>
        <button
          type="button"
          onClick={() => confirm('Reset the game? Scores and the board start over.') && resetGame()}
          title="Reset the game (Shift+R)"
          className={cn(barButton, 'text-red-300 hover:bg-red-500/20')}>
          <RotateCcw className="size-4" aria-hidden />
          <span className="sr-only">Reset the game</span>
        </button>
        <button type="button" onClick={onHide} title="Hide this bar (H)" className={cn(barButton, 'text-white/70 hover:bg-white/10')}>
          <EyeOff className="size-4" aria-hidden />
          <span className="max-lg:sr-only">Hide</span>
          <Kbd>H</Kbd>
        </button>
      </div>
    </motion.header>
  )
}

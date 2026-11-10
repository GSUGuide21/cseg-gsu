'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Undo2, X } from 'lucide-react'
import { useGame } from './Context'
import type { RoundType, TeamType } from './types'
import { cn } from '@/lib/cn'
import { money } from './ui'

const ROUNDS: { round: RoundType; label: string }[] = [
  { round: 'single', label: 'Jeopardy' },
  { round: 'double', label: 'Double Jeopardy' },
  { round: 'final', label: 'Final Jeopardy' },
]

const heading = 'm-0 text-sm font-bold tracking-wide text-[#d69f4c] uppercase'
const smallButton =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d69f4c] disabled:cursor-not-allowed disabled:opacity-40'

/** A team's score, typed in exactly; saved on Enter or leaving the box */
const ScoreField: React.FC<{ team: TeamType }> = ({ team }) => {
  const { setScore, currency } = useGame()
  const [draft, setDraft] = useState(String(team.score))
  // A score changed elsewhere (a clue, Undo) shows here too
  useEffect(() => setDraft(String(team.score)), [team.score])
  const save = () => {
    const score = Number(draft.replace(/[^\d-]/g, ''))
    if (draft.trim() === '' || !Number.isFinite(score)) return setDraft(String(team.score))
    setScore(team.id, score)
  }
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
      <label htmlFor={`score-${team.id}`} className="min-w-0 truncate font-semibold">
        {team.name}
        <span className="ml-2 text-sm font-normal text-white/55 tabular-nums">now {money(team.score, currency)}</span>
      </label>
      <span className="relative w-32 shrink-0">
        <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-white/50">{currency}</span>
        <input
          id={`score-${team.id}`}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            }
          }}
          className="w-full rounded-md border border-white/25 bg-black/40 py-1.5 pr-2 pl-6 text-right font-bold text-white tabular-nums focus:border-[#d69f4c] focus:outline-none"
        />
      </span>
    </li>
  )
}

/**
 * The host's menu for fixing the game mid-play (the host bar's Fix, or M): take back the
 * last score change, set a score exactly, put a tile back on the board or take one off,
 * and jump to a round. Closes with ×, Esc, or a click outside.
 */
export const HostMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { teams, categories, round, currency, lastScoreChange, undoScore, setClueRevealed, goToRound } = useGame()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => closeRef.current?.focus(), [])

  const jump = (next: RoundType, label: string) => {
    if (next === round && !confirm(`Start ${label} over? Its board fills up again; scores stay.`)) return
    if (next !== round && !confirm(`Go to ${label}? Its board starts fresh; teams and scores stay.`)) return
    goToRound(next)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-menu-title"
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 16, scale: 0.98 }}
        onKeyDown={(e) => {
          // Its own keys: the board's shortcuts wait while it's open
          e.stopPropagation()
          if (e.key === 'Escape') onClose()
        }}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#d69f4c] bg-[#0b1033] text-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
          <div>
            <h2 id="host-menu-title" className="m-0 text-xl font-bold text-[#d69f4c]">Fix the game</h2>
            <p className="m-0 text-sm text-white/60">For the host: put right a misclick without starting over.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the host menu (Esc)"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d69f4c]">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-4">
          <section aria-labelledby="fix-scores" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="fix-scores" className={heading}>Scores</h3>
              <button type="button" onClick={undoScore} disabled={!lastScoreChange} className={cn(smallButton, 'bg-white/10 hover:bg-white/20')}>
                <Undo2 className="size-4" aria-hidden />
                {lastScoreChange ? `Undo ${lastScoreChange}` : 'Nothing to undo'}
              </button>
            </div>
            {teams.length ? (
              <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                {teams.map((team) => (
                  <ScoreField key={team.id} team={team} />
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-white/60">No teams yet. Add them from Teams in the host bar.</p>
            )}
          </section>

          {round !== 'final' ? (
            <section aria-labelledby="fix-board" className="flex flex-col gap-2">
              <h3 id="fix-board" className={heading}>The board</h3>
              <p className="m-0 text-sm text-white/60">Click a tile to put it back on the board, or take it off. Scores don’t change.</p>
              <div className="grid grid-cols-6 gap-1.5">
                {categories.map((category) => (
                  <div key={category.id} className="flex min-w-0 flex-col gap-1.5">
                    <p className="m-0 truncate text-center text-xs font-bold text-white/75 uppercase" title={category.title}>
                      {category.title}
                    </p>
                    {category.clues.map((clue) => (
                      <button
                        key={clue.id}
                        type="button"
                        aria-pressed={!!clue.revealed}
                        aria-label={`${category.title}, ${currency}${clue.value}: ${clue.revealed ? 'played; put it back' : 'not played; take it off'}`}
                        onClick={() => setClueRevealed(category.id, clue.id, !clue.revealed)}
                        className={cn(
                          'cursor-pointer rounded-md py-1.5 text-sm font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-[#d69f4c]',
                          clue.revealed ? 'bg-black/40 text-white/30 line-through hover:bg-black/60' : 'bg-[#071277] text-[#d69f4c] hover:bg-[#0a1a99]'
                        )}>
                        {currency}
                        {clue.value}
                        {clue.dailyDouble ? <span className="ml-1 text-[0.65rem] text-yellow-300">DD</span> : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="fix-round" className="flex flex-col gap-2">
            <h3 id="fix-round" className={heading}>Round</h3>
            <p className="m-0 text-sm text-white/60">Go to any round, or start this one over. Teams and scores stay.</p>
            <div className="flex flex-wrap gap-2">
              {ROUNDS.map(({ round: r, label }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => jump(r, label)}
                  disabled={r === 'final' && !teams.length}
                  className={cn(smallButton, r === round ? 'border border-[#d69f4c] text-[#d69f4c] hover:bg-[#d69f4c]/15' : 'bg-white/10 hover:bg-white/20')}>
                  {r === round ? `Restart ${label}` : label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

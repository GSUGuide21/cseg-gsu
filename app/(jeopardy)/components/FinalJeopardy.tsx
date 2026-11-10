'use client'
import React, {
  useEffect,
  useCallback,
  useRef
} from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, RotateCcw, Undo2, X } from 'lucide-react'
import { useGame } from './Context'
import {
  FinalJeopardyProps,
  FinalJeopardyPhase
} from './types'
import { cn } from '@/lib/cn'
import { korinna, swissBT } from './fonts'
import { clueBackdrop, clueTextSize, flip, money, onBackdrop, panel, primaryButton, quietButton, rightButton, size, tileBlue, wrongButton } from './ui'

const PHASES: FinalJeopardyPhase[] = ['category', 'wagering', 'question', 'rewarding', 'results']

/** What the host sees at each step, and what moving on is called */
const NEXT_LABEL: Record<FinalJeopardyPhase, string> = {
  category: 'Wagers',
  wagering: 'Show the clue',
  question: 'Show the answer',
  rewarding: 'Final scores',
  results: '',
}

/** The most a team can wager: everything it has, or 1,000 when it has less */
const maxWagerFor = (score: number) => Math.max(score, 1000)

/**
 * The last round, in the board's look: the category on a tile, wagers, the clue and answer
 * on the clue screen's backdrop, then the final scores. → and Enter move on, ← goes back.
 */
const FinalJeopardyComponent: React.FC<FinalJeopardyProps> = ({ className }) => {
  const {
    round,
    teams,
    finalClue,
    finalWagers,
    setFinalWager,
    currency,
    rewardTeam,
    penalizeTeam,
    resetGame,
    // Where the round is, and each team's answer once the host has called it (scored once,
    // and undoable): kept with the game, so a refresh can't score a call twice
    finalPhase: phase,
    setFinalPhase: setPhase,
    finalJudged: judged,
    setFinalJudged: setJudged
  } = useGame()

  const step = PHASES.indexOf(phase)
  const goTo = useCallback((next: FinalJeopardyPhase) => setPhase(next), [setPhase])

  const unwagered = teams.filter((t) => !finalWagers[t.id])
  const forward = useCallback(() => {
    if (phase === 'results') return
    if (phase === 'wagering' && unwagered.length && !confirm(`${unwagered.map((t) => t.name).join(', ')} ${unwagered.length === 1 ? 'hasn’t' : 'haven’t'} wagered. Go on with $0 for ${unwagered.length === 1 ? 'that team' : 'them'}?`)) return
    goTo(PHASES[step + 1])
  }, [phase, step, unwagered, goTo])
  const back = useCallback(() => {
    // Scores are settled once the results show; going back to judging would double them
    if (step > 0 && phase !== 'results') goTo(PHASES[step - 1])
  }, [step, phase, goTo])

  // → and Enter move on, ← goes back (not while typing a wager)
  const keysRef = useRef({ forward, back })
  keysRef.current = { forward, back }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        keysRef.current.forward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        keysRef.current.back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleWagerChange = useCallback((teamId: string, wager: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    const amount = Math.max(0, parseInt(wager) || 0)
    setFinalWager(teamId, Math.min(amount, maxWagerFor(team.score)))
  }, [teams, setFinalWager])

  /** Calls a team's answer, or changes the call: the score moves by the difference */
  const judge = useCallback((teamId: string, call: 'right' | 'wrong' | null) => {
    const wager = finalWagers[teamId] || 0
    const was = judged[teamId]
    if (was === call) return
    if (was === 'right') penalizeTeam(teamId, wager)
    if (was === 'wrong') rewardTeam(teamId, wager)
    if (call === 'right') rewardTeam(teamId, wager)
    if (call === 'wrong') penalizeTeam(teamId, wager)
    setJudged((j) => {
      const next = { ...j }
      if (call) next[teamId] = call
      else delete next[teamId]
      return next
    })
  }, [finalWagers, judged, rewardTeam, penalizeTeam, setJudged])

  if (round !== 'final') return null

  if (!finalClue || teams.length === 0)
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center gap-4 text-center', clueBackdrop)}>
        <h2 className={cn(onBackdrop, size.heading, korinna.className)}>Final Jeopardy</h2>
        <p className={cn('m-0 text-white/80', size.label)}>Add a team to play the final round.</p>
      </div>
    )

  const { category, question, answer } = finalClue
  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score

  const content = (() => {
    switch (phase) {
      case 'category':
        return (
          <div className="flex flex-col items-center gap-[4vh]">
            <p className={cn('m-0 font-bold tracking-[0.2em] text-[#d69f4c] uppercase', size.label, swissBT.className)}>Final Jeopardy</p>
            {/* The category, on a tile like the board's headers */}
            <div className={cn(tileBlue, 'flex min-h-[28vh] w-[min(80vw,60rem)] items-center justify-center px-[5vw] py-[4vh] shadow-2xl')}>
              <h2 className={cn(onBackdrop, 'm-0', swissBT.className)} style={{ fontSize: clueTextSize(category) }}>{category}</h2>
            </div>
            <p className={cn('m-0 text-white/75', size.label)}>Teams, decide how much to wager on this category.</p>
          </div>
        )

      case 'wagering':
        return (
          <div className="flex w-full max-w-6xl flex-col items-center gap-[3vh]">
            <div className="text-center">
              <p className={cn('m-0 font-bold tracking-[0.2em] text-[#d69f4c] uppercase', size.label, swissBT.className)}>Wagers</p>
              <h2 className={cn(onBackdrop, 'm-0', size.heading, swissBT.className)}>{category}</h2>
            </div>
            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-[1.5vmin]">
              {teams.map((team, i) => {
                const wager = finalWagers[team.id] || 0
                const max = maxWagerFor(team.score)
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.07 }}
                    className={cn(panel, 'relative flex flex-col items-center gap-[1vmin] p-[1.8vmin]', wager > 0 && 'border-[#d69f4c]/70')}>
                    <div className={cn('font-bold text-white text-center leading-tight', size.team)}>{team.name}</div>
                    <div className={cn('text-white/70 tabular-nums', size.small)}>{money(team.score, currency)}</div>
                    <label className="flex w-full flex-col items-center gap-1">
                      <span className="sr-only">{team.name}’s wager</span>
                      <span className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-white/60">{currency}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={wager || ''}
                          onChange={(e) => handleWagerChange(team.id, e.target.value)}
                          min={0}
                          max={max}
                          className="w-full rounded-lg border-2 border-white/25 bg-black/30 py-2 pl-8 pr-3 text-center text-[clamp(1.1rem,2.6vmin,1.8rem)] font-bold text-white tabular-nums focus:border-[#d69f4c] focus:outline-none focus:ring-4 focus:ring-[#d69f4c]/30"
                        />
                      </span>
                      <span className={cn('text-white/60', size.small)}>Up to {currency}{max.toLocaleString()}</span>
                    </label>
                    <div className="grid w-full grid-cols-3 gap-1.5">
                      {([['¼', 0.25], ['½', 0.5], ['All', 1]] as const).map(([label, share]) => {
                        const amount = Math.floor(Math.max(team.score, 0) * share)
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => handleWagerChange(team.id, String(amount))}
                            className={cn(
                              'cursor-pointer rounded-md py-1.5 text-sm font-bold transition-colors',
                              wager === amount && amount > 0 ? 'bg-[#d69f4c] text-[#071277]' : 'bg-white/10 text-white/85 hover:bg-white/20'
                            )}>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {wager > 0 ? <Check className="absolute top-3 right-3 size-5 text-[#d69f4c]" aria-label="Wagered" /> : null}
                  </motion.div>
                )
              })}
            </div>
            <p className={cn('m-0 text-white/70', size.small)}>
              {unwagered.length ? `${teams.length - unwagered.length} of ${teams.length} teams have wagered.` : 'Every team has wagered.'} Keep wagers hidden from the room until the clue’s answered.
            </p>
          </div>
        )

      case 'question':
        return (
          <div className="flex w-full max-w-[min(90vw,80rem)] flex-col items-center gap-[4vh] text-center">
            <p className={cn('m-0 font-bold tracking-[0.2em] text-[#d69f4c] uppercase', size.label, swissBT.className)}>{category}</p>
            <p className={cn(onBackdrop, 'm-0', korinna.className)} style={{ fontSize: clueTextSize(question) }}>{question}</p>
            <p className={cn('m-0 text-white/75', size.label)}>Teams, write down your answers.</p>
          </div>
        )

      case 'rewarding':
        return (
          <div className="flex w-full max-w-6xl flex-col items-center gap-[3vh] text-center">
            <p className={cn(onBackdrop, 'm-0', korinna.className)} style={{ fontSize: clueTextSize(answer) }}>{answer}</p>
            <p className={cn('m-0 text-white/80', size.label)}>Who got it? Each team wins or loses its wager.</p>
            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-[1.5vmin]">
              {teams.map((team, i) => {
                const wager = finalWagers[team.id] || 0
                const call = judged[team.id]
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    className={cn(panel, 'flex flex-col items-center gap-[1vmin] p-[1.8vmin]', call === 'right' && 'border-green-400/70', call === 'wrong' && 'border-red-400/70')}>
                    <div className={cn('font-bold text-white leading-tight', size.team)}>{team.name}</div>
                    <div className={cn('text-white/70 tabular-nums', size.small)}>
                      Wagered {currency}{wager.toLocaleString()} · now {money(team.score, currency)}
                    </div>
                    {call ? (
                      <div className="flex w-full items-center justify-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 font-bold', size.team, call === 'right' ? 'text-green-300' : 'text-red-300')}>
                          {call === 'right' ? <Check className="size-[1em]" aria-hidden /> : <X className="size-[1em]" aria-hidden />}
                          {call === 'right' ? `+${currency}${wager.toLocaleString()}` : `−${currency}${wager.toLocaleString()}`}
                        </span>
                        <button type="button" onClick={() => judge(team.id, null)} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10">
                          <Undo2 className="size-4" aria-hidden />
                          Undo
                        </button>
                      </div>
                    ) : (
                      <div className="flex w-full gap-2">
                        <button type="button" className={rightButton} onClick={() => judge(team.id, 'right')}>
                          <div className={cn('tabular-nums', size.small)}>+{currency}{wager.toLocaleString()}</div>
                          <div className="text-xs opacity-90">Right</div>
                        </button>
                        <button type="button" className={wrongButton} onClick={() => judge(team.id, 'wrong')}>
                          <div className={cn('tabular-nums', size.small)}>−{currency}{wager.toLocaleString()}</div>
                          <div className="text-xs opacity-90">Wrong</div>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )

      case 'results':
        return (
          <div className="flex w-full max-w-5xl flex-col items-center gap-[3vh] text-center">
            <motion.h2
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}
              className={cn(onBackdrop, 'm-0 text-[#d69f4c]', size.heading, korinna.className)}>
              {isTie ? 'It’s a tie!' : `${ranked[0].name} wins!`}
            </motion.h2>
            <ol className="m-0 flex w-full list-none flex-col gap-[1.2vmin] p-0">
              {ranked.map((team, i) => {
                const top = i === 0 || (isTie && team.score === ranked[0].score)
                return (
                  <motion.li
                    key={team.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    // Last place first, building up to the winner
                    transition={{ delay: 0.5 + (ranked.length - 1 - i) * 0.25 }}
                    className={cn(panel, 'flex items-center gap-[2vmin] px-[2.5vmin] py-[1.6vmin]', top && 'border-[#d69f4c] bg-[#d69f4c]/15')}>
                    <span className={cn('w-[2ch] font-bold tabular-nums', size.team, top ? 'text-[#d69f4c]' : 'text-white/60')}>{i + 1}</span>
                    <span className={cn('flex-1 text-left font-bold text-white', size.team)}>{team.name}</span>
                    <span className={cn('font-bold tabular-nums', size.team, team.score < 0 ? 'text-red-300' : top ? 'text-[#d69f4c]' : 'text-white')}>
                      {money(team.score, currency)}
                    </span>
                  </motion.li>
                )
              })}
            </ol>
            <button
              type="button"
              onClick={() => confirm('Start a new game? Scores and the board start over.') && resetGame()}
              className={primaryButton}>
              <RotateCcw className="size-[1em]" aria-hidden />
              New game
            </button>
          </div>
        )
    }
  })()

  return (
    <div className={cn('relative flex h-full w-full flex-col text-white', clueBackdrop, className)}>
      {/* Each step flips in, as the clue screen's do */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-[6vw] py-[4vh] perspective-distant">
        <AnimatePresence mode="wait">
          <motion.div key={phase} {...flip} className="flex w-full justify-center">
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The host's way through: back, where we are, and on */}
      {phase !== 'results' ? (
        <nav aria-label="Final round steps" className="flex shrink-0 items-center justify-between gap-4 px-[4vw] pb-[3vh]">
          <button type="button" onClick={back} disabled={step === 0} className={cn(quietButton, 'disabled:invisible')}>
            <ChevronLeft className="size-[1.2em]" aria-hidden />
            Back
          </button>
          <ol className="m-0 flex list-none gap-2 p-0" aria-label={`Step ${step + 1} of ${PHASES.length}`}>
            {PHASES.map((p, i) => (
              <li key={p} className={cn('h-2 rounded-full transition-all duration-300', i === step ? 'w-8 bg-[#d69f4c]' : i < step ? 'w-2 bg-[#d69f4c]/60' : 'w-2 bg-white/25')} />
            ))}
          </ol>
          <button type="button" onClick={forward} className={primaryButton}>
            {NEXT_LABEL[phase]}
            <ChevronRight className="size-[1.2em]" aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export const FinalJeopardy = React.memo(FinalJeopardyComponent)

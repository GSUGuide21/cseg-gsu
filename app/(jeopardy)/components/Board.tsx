'use client'
import React, {
  useState,
  useCallback,
  useEffect,
  useRef
} from "react"
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { Eye } from 'lucide-react'
import { useGame } from "./Context"
import { Category } from "./Category"
import { Teams } from "./Teams"
import { FinalJeopardy } from "./FinalJeopardy"
import { BoardProps } from './types'
import { HostBar } from "./HostBar"
import { HostMenu } from "./HostMenu"
import { cn } from '@/lib/cn'
import { korinna } from './fonts'

export const Board: React.FC<BoardProps> = React.memo(() => {
  const {
    categories,
    pickClue,
    clueIsOpen,
    startDoubleJeopardy,
    startFinalJeopardy,
    resetGame,
    round,
    teams
  } = useGame()

  // Game state
  const [showTransition, setShowTransition] = useState(false)
  const [transitionText, setTransitionText] = useState('')
  const [isDailyDouble, setIsDailyDouble] = useState(false)
  const [isFinalJeopardy, setIsFinalJeopardy] = useState(false)
  // The host's bar (H hides it for a clean board), and the teams panel kept open from it
  const [barVisible, setBarVisible] = useState(true)
  const [teamsPinned, setTeamsPinned] = useState(false)
  // The host's menu for fixing a score, a tile, or the round
  const [menuOpen, setMenuOpen] = useState(false)

  // Transition events
  const showTransitionEffect = useCallback((text: string) => {
    setTransitionText(text)
    setIsDailyDouble(false)
    setIsFinalJeopardy(false)
    setShowTransition(true)
    setTimeout(() => {
      setShowTransition(false)
    }, 2000)
  }, [])

  const handleDoubleJeopardyTransition = useCallback(() => {
    if (round !== 'single') return
    if (!teams || teams.length === 0) return
    showTransitionEffect('Double Jeopardy!')
    setTimeout(() => startDoubleJeopardy(), 500)
  }, [showTransitionEffect, startDoubleJeopardy, round, teams])

  const handleFinalJeopardyTransition = useCallback(() => {
    if (round !== 'double') return
    if (!teams || teams.length === 0) return
    showTransitionEffect('Final Jeopardy!')
    setTimeout(() => startFinalJeopardy(), 500)
  }, [showTransitionEffect, startFinalJeopardy, round, teams])

  const handleNextRound = useCallback(() => {
    if (round === 'single') handleDoubleJeopardyTransition()
    else if (round === 'double') handleFinalJeopardyTransition()
  }, [round, handleDoubleJeopardyTransition, handleFinalJeopardyTransition])

  const showDailyDoubleTransition = useCallback(() => {
    setTransitionText('Daily Double!')
    setIsDailyDouble(true)
    setShowTransition(true)
    setTimeout(() => {
      setShowTransition(false)
      setIsDailyDouble(false)
    }, 3000)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't interfere with form inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
    if (e.metaKey || e.ctrlKey || e.altKey) return

    // The clue screen has its own keys, and a Daily Double on its way is about to open it
    if (clueIsOpen || menuOpen) return

    const { key, shiftKey } = e

    switch (key) {
      case 'd':
      case 'D':
        // D or Shift+D - Start Double Jeopardy
        if (round === 'single' && teams.length > 0) {
          e.preventDefault()
          handleDoubleJeopardyTransition()
        }
        break
      case 'f':
      case 'F':
        // F or Shift+F - Start Final Jeopardy
        if (round === 'double' && teams.length > 0) {
          e.preventDefault()
          handleFinalJeopardyTransition()
        }
        break
      case 'n':
      case 'N':
        // Shift+N - Next round
        if (shiftKey) {
          e.preventDefault()
          handleNextRound()
        }
        break
      case 'r':
      case 'R':
        // Shift+R - Reset game
        if (shiftKey) {
          e.preventDefault()
          if (!confirm('Are you sure you want to reset the game?')) return
          resetGame()
          showTransitionEffect('Game reset')
        }
        break
      case 'h':
      case 'H':
        // H - Hide or show the host's bar
        e.preventDefault()
        setBarVisible((v) => !v)
        break
      case 'm':
      case 'M':
        // M - Open the host menu
        e.preventDefault()
        setMenuOpen(true)
        break
      case 't':
      case 'T':
        // T - Open or close the teams panel
        e.preventDefault()
        setTeamsPinned((v) => !v)
        break
      case 'Escape':
        // Esc - Close the teams panel
        setTeamsPinned(false)
        break
    }
  }, [handleDoubleJeopardyTransition, handleFinalJeopardyTransition, handleNextRound, resetGame, showTransitionEffect, round, clueIsOpen, menuOpen, teams])

  // On the window, so the keys work without clicking the board first (and after a clue
  // closes); the clue screen's own keys stop here before reaching it
  const keyRef = useRef(handleKeyDown)
  keyRef.current = handleKeyDown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (round === 'final' && teams.length === 0) return
    if (round !== 'final') return
    setIsFinalJeopardy(true)
    return () => setIsFinalJeopardy(false)
  }, [round, teams])

  const renderBoard = () => {
    switch (round) {
      case 'single':
      case 'double':
        if (round === 'double' && teams.length === 0) return null
        return (
          // Keyed by round, so a new round's board fills in again
          <section key={round} className="grid grid-cols-6 gap-[0.8vh] w-full h-full overflow-hidden" aria-label="Board">
            {categories.map((category, column) => (
              <Category
                key={category.id}
                round={round}
                column={column}
                category={category}
                onSelectClue={(clue) => {
                  if (clue.dailyDouble) {
                    pickClue(category.id, clue.id, showDailyDoubleTransition)
                  } else {
                    pickClue(category.id, clue.id)
                  }
                }}
              />
            ))}
          </section>
        )
      case 'final':
        if (!isFinalJeopardy) return null
        return (
          <FinalJeopardy />
        )
      default:
        return null
    }
  }

  return (
    // Animations follow the computer's "reduce motion" setting
    <MotionConfig reducedMotion="user">
      <div className="w-full h-full relative flex flex-col">
        <AnimatePresence initial={false}>
          {barVisible ? (
            <HostBar
              key="bar"
              onNextRound={handleNextRound}
              teamsOpen={teamsPinned}
              onToggleTeams={() => setTeamsPinned((v) => !v)}
              onOpenMenu={() => setMenuOpen(true)}
              onHide={() => setBarVisible(false)}
            />
          ) : null}
        </AnimatePresence>
        {barVisible ? null : (
          <button
            type="button"
            onClick={() => setBarVisible(true)}
            className="absolute top-2 right-2 z-40 cursor-pointer rounded-md p-2 text-white/25 transition-colors hover:bg-black/60 hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-[#d69f4c]"
            title="Show the host's bar (H)">
            <Eye className="size-5" aria-hidden />
            <span className="sr-only">Show the host’s bar</span>
          </button>
        )}

        <AnimatePresence>{menuOpen ? <HostMenu key="menu" onClose={() => setMenuOpen(false)} /> : null}</AnimatePresence>

        {/* Teams Panel */}
        <Teams open={teamsPinned} onClose={() => setTeamsPinned(false)} />

        {/* Game Board */}
        <div className="w-full min-h-0 flex-1 flex items-center justify-center overflow-hidden p-[0.8vh]">
          {renderBoard()}
        </div>

        {/* Transition effect */}
        <AnimatePresence>
          {showTransition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40">
              <motion.div
                initial={{ scale: 0.6, rotate: isDailyDouble ? -6 : 0 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 1.15, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                className={cn(
                  "backdrop-blur-sm rounded-2xl px-[4vw] py-[3vh] shadow-2xl",
                  isDailyDouble ? "bg-linear-to-r from-yellow-600/95 to-orange-600/95 border-4 border-yellow-300" : "bg-black/90 border-2 border-[#d69f4c]"
                )}>
                <div className={cn(
                  "font-bold text-center text-white text-shadow-[0.05em_0.05em_0_rgba(0,0,0,1)]",
                  "text-[clamp(2.5rem,9vmin,8rem)]",
                  korinna.className
                )}>
                  {transitionText}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
})

Board.displayName = 'Board'

'use client'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image' // Next.js optimized images
import { useGame } from "./Context"       // Game state management
import { ClueProps, QuestionType } from "./types"       // TypeScript interface
import { cn } from '@/lib/cn'
import { korinna } from './fonts'
import { clueBackdrop, clueTextSize, dailyDoubleBackdrop, flip, money } from './ui'

const getEmbedUrl = (url: string, type?: string) => {
  if (!url) return url
  switch (type) {
    case 'youtube': {
      const ytVideoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0]
      return ytVideoId ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=1` : url
    }
    case 'vimeo': {
      const vimeoVideoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return vimeoVideoId ? `https://player.vimeo.com/video/${vimeoVideoId}?autoplay=1&muted=1` : url
    }
    case 'dailymotion': {
      const dailymotionVideoId = url.split('dailymotion.com/')[1]?.split('?')[0]
      return dailymotionVideoId ? `https://www.dailymotion.com/embed/video/${dailymotionVideoId}?autoplay=1&muted=1` : url
    }
    default:
      return url
  }
}

/** A clue's picture, video, sound, or embed, sized to leave room for its words */
const Media: React.FC<{ media: QuestionType; label: string }> = ({ media: { image, video, audio, embed, embedType }, label }) => (
  <div className="mb-[3vh] flex justify-center">
    <div className="relative max-w-full max-h-[42vh] overflow-hidden rounded-lg shadow-2xl">
      {image && (
        <Image
          src={image}
          alt={`${label} visual`}
          width={1200}
          height={900}
          style={{ objectFit: 'contain' }}
          className="max-h-[42vh] w-auto"
        />
      )}
      {video && (
        <video controls className="max-h-[42vh] max-w-full" preload="metadata">
          <source src={video} type="video/mp4" />
          <source src={video} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}
      {audio && (
        <div className="p-6 bg-gradient-to-b from-black/20 to-black/40 flex flex-col items-center justify-center min-h-[150px]">
          <h3 className="text-[clamp(1rem,2.5vmin,1.75rem)] text-white mb-3 text-center">{label} audio</h3>
          <audio controls className="w-full max-w-md" preload="metadata">
            <source src={audio} type="audio/mpeg" />
            <source src={audio} type="audio/wav" />
            Your browser does not support the audio tag.
          </audio>
        </div>
      )}
      {embed && (
        <div className="relative w-[min(80vw,70vh*16/9)]" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={getEmbedUrl(embed, embedType)}
            title={`${label} media`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  </div>
)


export const ClueModal: React.FC<ClueProps> = ({ clue }) => {
  const {
    selectedClue,
    teams,
    closeClue,
    rewardTeam,
    penalizeTeam,
    clueIsOpen,
    currency,
    markClueAsRevealed,
    dailyDoubleMax
  } = useGame()
  const {
    id,
    value,
    question: questionObj,
    answer,
    dailyDouble
  } = clue
  const { image, video, audio, embed, text: question } = questionObj

  const [showAnswer, setShowAnswer] = useState(false)
  const [dailyDoubleWagers, setDailyDoubleWagers] = useState<Record<string, number>>({})
  // Teams that answered wrong: they've lost the points and can't answer again
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  // Focused when it opens, so the keys (Enter, arrows, Esc) work without a click first
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true })
  }, [])

  const handleCloseClue = useCallback(() => {
    closeClue()
    setShowAnswer(false)
    setDailyDoubleWagers({})
    setMissed(new Set())
  }, [closeClue])

  const handleDailyDoubleWagerChange = useCallback((teamId: string, wager: number) => {
    if (!teams.some(t => t.id === teamId)) return
    const validWager = Math.max(0, Math.min(wager, dailyDoubleMax(teamId)))
    setDailyDoubleWagers(prev => ({ ...prev, [teamId]: validWager }))
  }, [teams, dailyDoubleMax])

  // Right: the team scores and the clue is done
  const handleRewardScore = useCallback((teamId: string, amount: number) => () => {
    rewardTeam(teamId, amount)
    if (selectedClue?.categoryId)
      markClueAsRevealed(selectedClue.categoryId, id)
    handleCloseClue()
  }, [handleCloseClue, rewardTeam, markClueAsRevealed, selectedClue?.categoryId, id])

  // Wrong: the team loses the points, and another can try. A Daily Double is one team's,
  // so it's done either way
  const handlePenalizeScore = useCallback((teamId: string, amount: number) => () => {
    penalizeTeam(teamId, amount)
    if (!dailyDouble) {
      setMissed(prev => new Set(prev).add(teamId))
      return
    }
    if (selectedClue?.categoryId) markClueAsRevealed(selectedClue.categoryId, id)
    handleCloseClue()
  }, [handleCloseClue, penalizeTeam, markClueAsRevealed, selectedClue?.categoryId, id, dailyDouble])

  const toggleAnswer = useCallback(() => {
    setShowAnswer(prev => !prev)
  }, [])

  const hasMedia = !!(image || video || audio || embed)

  const handleBack = useCallback(() => {
    setShowAnswer(false)
  }, [])

  // Done with it, nobody scored: the tile empties all the same
  const finishClue = useCallback(() => {
    if (selectedClue?.categoryId) markClueAsRevealed(selectedClue.categoryId, id)
    handleCloseClue()
  }, [selectedClue?.categoryId, id, markClueAsRevealed, handleCloseClue])

  const handleForward = useCallback(() => {
    if (!showAnswer) setShowAnswer(true)
    else finishClue()
  }, [showAnswer, finishClue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedClue?.id !== id || !clueIsOpen) return

    // Prevent event bubbling to avoid conflicts with Board key bindings
    e.stopPropagation()

    // Typing a wager isn't a shortcut
    if (e.target instanceof HTMLInputElement) {
      if (e.key === 'Escape') rootRef.current?.focus()
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        handleCloseClue()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        toggleAnswer()
        break
      case 'ArrowLeft':
        e.preventDefault()
        handleBack()
        break
      case 'ArrowRight':
        e.preventDefault()
        handleForward()
        break
    }
  }, [selectedClue, id, handleCloseClue, clueIsOpen, handleBack, handleForward, toggleAnswer])

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={showAnswer ? 'Answer' : 'Clue'}
      onKeyDown={handleKeyDown}
      className={cn("fixed inset-0 z-50 flex items-center justify-center outline-none", korinna.className)}>
      {/* The tile, grown to fill the screen (and shrunk back on close) */}
      <motion.div
        layoutId={`clue-${id}`}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className={cn(
          "absolute inset-0",
          dailyDouble ? dailyDoubleBackdrop : clueBackdrop
        )}
      />

      {/* Everything on it, once the tile has grown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        className="relative flex h-full w-full items-center justify-center px-[8vw] py-[6vh] perspective-distant">
        {/* Clue navigation */}
        <div className="absolute inset-0 pointer-events-none flex justify-between items-center px-[2vw]">
          <motion.button
            onClick={handleBack}
            whileHover={{ scale: showAnswer ? 1.1 : 1 }}
            whileTap={{ scale: showAnswer ? 0.9 : 1 }}
            aria-label="Back to the clue"
            className={cn(
              "pointer-events-auto p-[1.2vmin] text-white rounded-full backdrop-blur-sm border transition-all duration-200 shadow-lg",
              showAnswer
                ? "bg-black/30 hover:bg-black/50 border-white/20"
                : "bg-black/10 border-white/10 cursor-not-allowed opacity-40"
            )}
            disabled={!showAnswer}
          >
            <ChevronLeft className="size-[clamp(1.5rem,4vmin,3rem)]" />
          </motion.button>
          <motion.button
            onClick={handleForward}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={showAnswer ? 'Close' : 'Show the answer'}
            className="pointer-events-auto p-[1.2vmin] bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 shadow-lg"
          >
            <ChevronRight className="size-[clamp(1.5rem,4vmin,3rem)]" />
          </motion.button>
        </div>

        {/* Daily Double Badge */}
        {dailyDouble && (
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="absolute top-[4vh] right-[4vw] z-10">
            <div className="bg-linear-to-r from-yellow-400 via-yellow-500 to-orange-500 px-[1.2em] py-[0.5em] rounded-full shadow-2xl border-4 border-white/20 text-[clamp(0.9rem,2.4vmin,1.75rem)]">
              <div className="text-black font-bold uppercase tracking-wider">
                Daily Double
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {!showAnswer ? (
            <motion.div key="clue" {...flip} className="w-full max-w-[min(90vw,80rem)] text-center">
              {hasMedia && <Media media={questionObj} label="Clue" />}
              <p
                className={cn(
                  "m-0 font-bold leading-[1.15] uppercase text-balance text-shadow-[0.05em_0.05em_0_rgba(0,0,0,1)]",
                  dailyDouble ? "text-yellow-100" : "text-white"
                )}
                style={{ fontSize: clueTextSize(question, hasMedia) }}>
                {question}
              </p>
            </motion.div>
          ) : (
            <motion.div key="answer" {...flip} className="flex w-full max-w-[min(92vw,90rem)] flex-col items-center text-center">
              <p
                className="m-0 mb-[3vh] font-bold text-white leading-[1.15] uppercase text-balance text-shadow-[0.05em_0.05em_0_rgba(0,0,0,1)]"
                style={{ fontSize: clueTextSize(answer) }}>
                {answer}
              </p>
              <div className="flex flex-col items-center gap-[2vh] w-full">
                <div className="text-center">
                  {dailyDouble ? (
                    <>
                      <h4 className="m-0 text-[clamp(1.25rem,3vmin,2.25rem)] text-yellow-200 font-bold">Daily Double</h4>
                      <p className="m-0 text-[clamp(0.9rem,1.8vmin,1.25rem)] text-yellow-100/90">
                        The team that picked it wagers up to its score (or the board’s top value, if that’s more): right adds the wager, wrong takes it away.
                      </p>
                    </>
                  ) : (
                    <p className="m-0 text-[clamp(0.9rem,2vmin,1.4rem)] text-white/80">Who got it? A wrong answer loses the points, and another team can try.</p>
                  )}
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-[1.5vmin] w-full max-w-6xl">
                  {teams.map((team, i) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.07 }}
                      className={cn(
                        "flex flex-col items-center backdrop-blur-sm rounded-xl p-[1.5vmin] transition-colors duration-300",
                        dailyDouble
                          ? "bg-black/25 border-2 border-yellow-300/50"
                          : "bg-black/25 border border-white/15 hover:border-[#d69f4c]/60"
                      )}>
                      <div className="text-[clamp(1rem,2.4vmin,1.75rem)] font-bold text-white text-center leading-tight">{team.name}</div>
                      <div className="mb-[1vmin] text-[clamp(0.8rem,1.6vmin,1.1rem)] text-white/70 tabular-nums">
                        {money(team.score, currency)}
                        {missed.has(team.id) ? <span className="ml-2 font-semibold text-red-200">Missed it</span> : null}
                      </div>

                      {dailyDouble && (
                        <label className="w-full mb-[1vmin] flex flex-col items-center gap-1">
                          <span className="text-sm text-yellow-100 font-bold">Wager (up to {currency}{dailyDoubleMax(team.id).toLocaleString()})</span>
                          <span className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-100/70 font-bold">{currency}</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="0"
                              value={dailyDoubleWagers[team.id] || ''}
                              onChange={e => handleDailyDoubleWagerChange(team.id, parseInt(e.target.value) || 0)}
                              className="w-full pl-8 pr-3 py-2 text-lg font-bold text-center rounded-lg border-2 border-yellow-300 bg-black/30 text-yellow-50 focus:outline-none focus:ring-4 focus:ring-yellow-300/40"
                              min="0"
                              max={dailyDoubleMax(team.id)}
                            />
                          </span>
                        </label>
                      )}

                      <div className="flex gap-2 w-full">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          disabled={missed.has(team.id)}
                          className="flex-1 py-[1vmin] px-2 bg-green-600 enabled:hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-35"
                          onClick={handleRewardScore(team.id, dailyDouble ? dailyDoubleWagers[team.id] || 0 : value)}>
                          <div className="text-[clamp(0.9rem,1.8vmin,1.3rem)] tabular-nums">
                            +{currency}{(dailyDouble ? (dailyDoubleWagers[team.id] || 0) : value).toLocaleString()}
                          </div>
                          <div className="text-xs opacity-90">Right</div>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          disabled={missed.has(team.id)}
                          className="flex-1 py-[1vmin] px-2 bg-red-600 enabled:hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-35"
                          onClick={handlePenalizeScore(team.id, dailyDouble ? dailyDoubleWagers[team.id] || 0 : value)}>
                          <div className="text-[clamp(0.9rem,1.8vmin,1.3rem)] tabular-nums">
                            −{currency}{(dailyDouble ? (dailyDoubleWagers[team.id] || 0) : value).toLocaleString()}
                          </div>
                          <div className="text-xs opacity-90">Wrong</div>
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={finishClue}
                  className="cursor-pointer rounded-lg border border-white/25 bg-black/20 px-4 py-2 text-[clamp(0.85rem,1.6vmin,1.1rem)] font-semibold text-white/85 hover:bg-black/40">
                  Nobody got it
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

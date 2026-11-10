'use client'
import React, {
  useCallback
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { useGame } from "./Context"
import { ClueModal } from "./ClueModal"
import { ClueProps } from "./types"
import { cn } from '@/lib/cn'
import { swissValue } from './fonts'

/**
 * One tile on the board. Its face shares a layoutId with the clue screen, so picking it
 * grows the tile into the clue, and closing the clue shrinks it back into place. The value
 * is sized to the tile (container query width), so it reads from the back of a room.
 */
export const Clue: React.FC<ClueProps> = ({
  clue,
  disabled,
  onSelect,
  delay = 0
}) => {
  const { selectedClue, currency } = useGame()
  const { id, value, revealed } = clue

  const isSelected = selectedClue?.id === id
  const done = disabled || revealed

  // The board picks the clue (it knows about Daily Doubles); picking it here too ran it twice
  const handleClick = useCallback(() => {
    if (done) return
    onSelect?.()
  }, [done, onSelect])

  return (
    <li className="relative flex flex-1 @container">
      <motion.button
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.35, ease: 'easeOut' }}
        onClick={handleClick}
        disabled={done || isSelected}
        aria-label={done ? 'Already played' : `${currency}${value}`}
        className={cn(
          "relative w-full h-full flex place-items-center place-content-center",
          "group cursor-pointer disabled:cursor-default",
          "text-[#d69f4c] text-shadow-[0.06em_0.06em_0_rgba(0,0,0,1)]",
          "focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white",
          swissValue.className
        )}>
        {/* The tile's face; while its clue is open, it's the clue screen */}
        {!isSelected && (
          <motion.span
            layoutId={`clue-${id}`}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute inset-0 bg-[#071277] transition-colors duration-200 group-enabled:group-hover:bg-[#0a1a99]"
          />
        )}
        <span
          className={cn(
            "relative flex items-baseline gap-[0.04em] font-bold leading-none tracking-wide",
            "text-[clamp(1.5rem,30cqw,8rem)] transition-opacity duration-500",
            (done || isSelected) && "opacity-0"
          )}>
          <span className="text-[0.75em]">{currency}</span>
          {value}
        </span>
      </motion.button>
      <AnimatePresence>{isSelected && <ClueModal clue={clue} />}</AnimatePresence>
    </li>
  )
}

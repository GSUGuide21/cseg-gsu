'use client'
import React, { useCallback } from "react"
import { motion } from "motion/react"
import { Clue } from "./Clue"
import {
  CategoryProps,
  ClueType
} from "./types"
import { cn } from '@/lib/cn'
import { swissBT } from './fonts'

/**
 * A category title's size, as a share of its column's width: short titles fill it, long ones
 * shrink to fit two or three lines. Clamped so it's never too small to read on a projector.
 */
const titleSize = (title: string) => {
  const n = title.length
  const share = n <= 8 ? 15 : n <= 12 ? 12 : n <= 18 ? 10 : n <= 26 ? 8.5 : 7
  return `clamp(0.95rem, ${share}cqw, 3rem)`
}

/** Seconds between tiles as the board fills in: across, then down */
const COLUMN_STEP = 0.05
const ROW_STEP = 0.08

export const Category: React.FC<CategoryProps> = ({
  category,
  round,
  onSelectClue,
  column = 0
}) => {
  const { clues, id, title } = category

  const onSelect = useCallback((clue: ClueType) => {
    // Only allow selecting a clue if not in the "final" round
    if (round !== "final") onSelectClue?.(clue)
  }, [onSelectClue, round])

  return (
    <nav className="flex min-w-0 flex-col h-full gap-[0.8vh]" id={id} aria-label={title}>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: column * COLUMN_STEP, duration: 0.4 }}
        className={cn(
          "@container bg-[#071277] text-white text-center font-bold",
          "text-shadow-[0.05em_0.05em_0_rgba(0,0,0,0.8)] tracking-wider",
          "px-[0.4em] h-[14vh] min-h-16 flex items-center justify-center",
          swissBT.className
        )}>
        <h2 className="uppercase leading-[1.05] text-balance [overflow-wrap:anywhere]" style={{ fontSize: titleSize(title) }}>
          {title}
        </h2>
      </motion.header>
      <ul className="flex flex-col flex-1 gap-[0.8vh]">
        {clues.map((clue, row) => (
          <Clue
            key={clue.id}
            clue={clue}
            categoryId={id}
            disabled={!!clue.selected}
            onSelect={() => onSelect(clue)}
            delay={0.25 + column * COLUMN_STEP + row * ROW_STEP}
          />
        ))}
      </ul>
    </nav>
  )
}

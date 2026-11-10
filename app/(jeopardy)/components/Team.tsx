'use client'
import React, {
  useCallback,
  useState
} from "react"
import { motion } from "motion/react"
import { Minus, Plus, X } from 'lucide-react'
import { useGame } from "./Context"
import { TeamType } from "./types"
import { cn } from '@/lib/cn'
import { univers } from './fonts'
import { money, tileBlue } from './ui'

const smallButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d69f4c]'

/**
 * A team's card in the teams panel: its score on a board-blue tile, its name (click to
 * rename), quick −/+ for fixing a score by one clue's worth, and remove.
 */
export const Team: React.FC<{ team: TeamType; step: number; index: number }> = ({ team, step, index }) => {
  const { currency, updateTeam, removeTeam, adjustScore } = useGame()
  const { name, score, id } = team
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(name)

  const save = useCallback(() => {
    const trimmed = editingName.trim()
    if (trimmed && trimmed !== name) updateTeam(id, { name: trimmed })
    else setEditingName(name)
    setIsEditing(false)
  }, [editingName, name, id, updateTeam])

  const cancel = useCallback(() => {
    setEditingName(name)
    setIsEditing(false)
  }, [name])

  const remove = useCallback(() => {
    if (confirm(`Remove ${name}? Their score goes with them.`)) removeTeam(id)
  }, [name, id, removeTeam])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04 } }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-black/30">
      <button
        type="button"
        onClick={remove}
        aria-label={`Remove ${name}`}
        className={cn(smallButton, 'absolute top-1 right-1 z-10 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
        <X className="size-4" aria-hidden />
      </button>

      {/* The score, in the board's gold */}
      <div className={cn(tileBlue, 'flex items-center justify-center px-3 py-[1.4vmin]')}>
        <motion.span
          key={score}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={cn(
            'font-bold tabular-nums text-shadow-[0.06em_0.06em_0_rgba(0,0,0,1)]',
            'text-[clamp(1.3rem,3.4vmin,2.5rem)]',
            score < 0 ? 'text-red-300' : 'text-[#d69f4c]',
            univers.className
          )}>
          {money(score, currency)}
        </motion.span>
      </div>

      {/* The name; click it to rename */}
      <div className="flex min-h-[3.25rem] items-center justify-center px-3 py-2">
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') save()
              else if (e.key === 'Escape') cancel()
            }}
            onBlur={save}
            aria-label={`Rename ${name}`}
            maxLength={40}
            className="w-full rounded-md border border-[#d69f4c]/60 bg-black/40 px-2 py-1 text-center text-[clamp(0.95rem,2vmin,1.3rem)] font-semibold text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Rename"
            className="w-full cursor-text truncate rounded-md px-2 py-1 text-center text-[clamp(0.95rem,2vmin,1.3rem)] font-semibold text-white transition-colors hover:bg-white/10">
            {name}
          </button>
        )}
      </div>

      {/* Fixing a score by hand: one clue's worth at a time */}
      <div className="flex items-center justify-between border-t border-white/10 px-2 py-1">
        <button type="button" onClick={() => adjustScore(id, -step)} aria-label={`Take ${money(step, currency)} from ${name}`} className={smallButton}>
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="text-xs text-white/50 tabular-nums">{money(step, currency)}</span>
        <button type="button" onClick={() => adjustScore(id, step)} aria-label={`Give ${name} ${money(step, currency)}`} className={smallButton}>
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </motion.li>
  )
}

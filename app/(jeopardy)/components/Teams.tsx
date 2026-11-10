'use client'
import React, {
  useCallback,
  useState
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { Plus, X } from 'lucide-react'
import { useGame } from "./Context"
import { cn } from '@/lib/cn'
import { TeamsProps } from "./types"
import { Team } from "./Team"

/**
 * The teams panel: slides up over the bottom of the board when the host opens it (the
 * Teams button, T, or "Add teams to start") and back down with ×, Esc, or T. Add teams,
 * rename them, fix a score by hand, or remove one. Hidden while a clue is open.
 */
const TeamsComponent: React.FC<TeamsProps & {
  open?: boolean
  onClose?: () => void
}> = ({
  className,
  open = false,
  onClose
}) => {
  const { teams, addTeam, clueIsOpen, categories } = useGame()
  const [newTeamName, setNewTeamName] = useState('')

  // A score fix is one clue's worth: the round's smallest value
  const step = Math.min(...categories.flatMap((c) => c.clues.map((clue) => clue.value)), Infinity)

  const handleAddTeam = useCallback(() => {
    if (!newTeamName.trim()) return
    addTeam(newTeamName.trim())
    setNewTeamName('')
  }, [addTeam, newTeamName])

  const shown = open && !clueIsOpen

  return (
    <AnimatePresence>
      {shown ? (
        <motion.section
          key="teams"
          aria-label="Teams"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose?.()
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 max-h-[45vh] overflow-y-auto",
            "border-t-2 border-[#d69f4c] bg-black/90 px-[3vw] pt-3 pb-[2vh] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md",
            className
          )}>
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="m-0 text-[clamp(1rem,2.2vmin,1.4rem)] font-bold text-[#d69f4c]">Teams</h2>
              <p className="m-0 hidden text-sm text-white/55 md:block">Click a name to rename it · −/+ fixes a score by one clue</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close the teams panel (T)"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d69f4c]">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3 p-0">
              <AnimatePresence initial={false}>
                {teams.map((team, index) => (
                  <Team key={team.id} team={team} index={index} step={Number.isFinite(step) ? step : 100} />
                ))}
              </AnimatePresence>

              {/* A new team */}
              <li className="flex min-w-0 flex-col justify-center gap-2 rounded-xl border-2 border-dashed border-white/25 p-3">
                <label htmlFor="new-team-name" className="text-sm font-semibold text-white/75">
                  {teams.length ? 'Add another team' : 'Add the first team'}
                </label>
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddTeam()
                  }}>
                  <input
                    id="new-team-name"
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team name"
                    maxLength={40}
                    autoComplete="off"
                    autoFocus={!teams.length}
                    className="w-full rounded-md border border-white/25 bg-black/40 px-2 py-1.5 text-white placeholder:text-white/40 focus:border-[#d69f4c] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    aria-label="Add the team"
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md bg-[#d69f4c] px-3 py-1.5 font-bold text-[#071277] transition-colors hover:bg-[#e8b766] disabled:cursor-not-allowed disabled:opacity-40">
                    <Plus className="size-4" aria-hidden />
                    Add
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}

export const Teams = React.memo(TeamsComponent)

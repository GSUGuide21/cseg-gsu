'use client'
import React from "react"
import { GameList } from "./GameList"
export { GameItem } from "./GameItem"

interface GameMenuProps {
  onNewGame?: () => void
  onResumeGame?: () => void
  onSettings?: () => void
  onQuit?: () => void
  showResume?: boolean
  games?: Array<{
    id: string
    name: string
    date?: string
    status?: string
  }>
  onSelectGame?: (id: string) => void
  selectedGameId?: string
  showGameList?: boolean
}

export const GameMenu: React.FC<GameMenuProps> = ({
  onNewGame,
  onResumeGame,
  onSettings,
  onQuit,
  showResume = false,
  games = [],
  onSelectGame,
  selectedGameId,
  showGameList = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 bg-[#071277] rounded-lg shadow-lg min-w-[300px] max-w-[500px]">
      <h2 className="text-3xl font-bold text-[#d69f4c] mb-4">Game Menu</h2>
      
      {/* Game List Section */}
      {showGameList && games.length > 0 && (
        <div className="w-full mb-4">
          <h3 className="text-xl font-semibold text-[#d69f4c] mb-3 text-center">Saved Games</h3>
          <div className="max-h-[300px] overflow-y-auto">
            <GameList
              games={games}
              onSelectGame={onSelectGame}
              selectedGameId={selectedGameId}
            />
          </div>
        </div>
      )}

      {/* Menu Buttons */}
      <div className="w-full flex flex-col gap-3">
        {showResume && (
          <button
            className="w-full py-2 px-4 bg-[#d69f4c] text-[#071277] font-semibold rounded hover:bg-[#b8862b] transition"
            onClick={onResumeGame}
          >
            Resume Game
          </button>
        )}
        <button
          className="w-full py-2 px-4 bg-[#d69f4c] text-[#071277] font-semibold rounded hover:bg-[#b8862b] transition"
          onClick={onNewGame}
        >
          New Game
        </button>
        <button
          className="w-full py-2 px-4 bg-[#d69f4c] text-[#071277] font-semibold rounded hover:bg-[#b8862b] transition"
          onClick={onSettings}
        >
          Settings
        </button>
        <button
          className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition"
          onClick={onQuit}
        >
          Quit
        </button>
      </div>
    </div>
  )
}

export default GameMenu

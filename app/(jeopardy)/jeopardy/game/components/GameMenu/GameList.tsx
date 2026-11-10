'use client'
import React from "react"
import { GameItem } from "./GameItem"

export interface GameListProps {
  games: Array<{
    id: string
    name: string
    date?: string
    status?: string
  }>
  onSelectGame?: (id: string) => void
  selectedGameId?: string
}

export const GameList: React.FC<GameListProps> = ({
  games,
  onSelectGame,
  selectedGameId,
}) => {
  if (!games || games.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No games found.
      </div>
    )
  }

  return (
    <ul className="w-full flex flex-col gap-2">
      {games.map((game) => (
        <GameItem
          key={game.id}
          id={game.id}
          name={game.name}
          date={game.date}
          status={game.status}
          isSelected={selectedGameId === game.id}
          onSelect={onSelectGame}
        />
      ))}
    </ul>
  )
}

export default GameList

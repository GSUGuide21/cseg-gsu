'use client'
import React from "react"

export interface GameItemProps {
  id: string
  name: string
  date?: string
  status?: string
  isSelected?: boolean
  onSelect?: (id: string) => void
}

export const GameItem: React.FC<GameItemProps> = ({
  id,
  name,
  date,
  status,
  isSelected = false,
  onSelect,
}) => {
  return (
    <li>
      <button
        className={`w-full flex flex-col items-start p-4 rounded-lg border transition
          ${
            isSelected
              ? "bg-[#d69f4c] text-[#071277] border-[#b8862b]"
              : "bg-[#071277] text-[#d69f4c] border-[#d69f4c] hover:bg-[#0a1a99]"
          }
        `}
        onClick={() => onSelect?.(id)}
      >
        <span className="font-bold text-lg">{name}</span>
        {date && (
          <span className="text-xs text-gray-300">{date}</span>
        )}
        {status && (
          <span className="text-xs text-gray-400">{status}</span>
        )}
      </button>
    </li>
  )
}

export default GameItem

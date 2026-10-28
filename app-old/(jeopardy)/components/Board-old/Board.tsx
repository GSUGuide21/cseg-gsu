'use client'
import React, {
  useEffect
} from 'react'
import clsx from 'clsx'
import { 
  useGameState, 
  type Round
} from './Context'
import { FinalJeopardy } from './FinalJeopardy'
import { Category } from './Category'
import { ClueItem } from './ClueItem'

export type BoardProps = React.HTMLAttributes<HTMLDivElement>

export const Board: React.FC<BoardProps> = ({
  className,
  ...props
}) => {
  const { 
    gameState, 
    getCurrentRound, 
    setClues 
  } = useGameState()

  const round = getCurrentRound()

  const { isFinalJeopardy, data } = round!
  const { categories = [] } = data as Round
  
  /* if (!gameState) return null

  const round = getCurrentRound()
  if (!round) return null

  const { isFinalJeopardy, data } = round
  if (!data) return null

  const { 
    categories = null, 
    baseValue 
  } = data as Round
  if (!categories) return null */

  return (
    <div
      {...props}
      className={clsx('jeopardy-board', className)}>
      {isFinalJeopardy ? (<FinalJeopardy />) : (
        <nav className="jeopardy-board__categories">
          {categories?.map((category, index) => (
            <Category
              key={index}
              className="jeopardy-board__category"
              title={category.title}>
              {category.clues.map((clue, clueIndex) => (
                <ClueItem
                  key={clueIndex}
                  className="jeopardy-board__clue-item"
                  value={clue.value}
                  clueId={clue.id as string} />
              ))}
            </Category>
          ))}
        </nav>
      )}
    </div>
  )
}
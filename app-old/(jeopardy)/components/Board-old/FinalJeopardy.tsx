'use client'
import React from 'react'
import clsx from 'clsx'
import { useGameState } from './Context'

export type FinalJeopardyProps = React.HTMLAttributes<HTMLDivElement>

export const FinalJeopardy: React.FC<FinalJeopardyProps> = ({
  className,
  ...props
}) => {
  const { gameState } = useGameState()
  if (!gameState) return null

  return (
    <div
      {...props}
      className={clsx('jeopardy-final-jeopardy', className)}>
      <h2>Final Jeopardy</h2>
    </div>
  )
}
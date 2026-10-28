'use client'
import React from 'react'
import { BoardProvider } from './Context'

export type BoardProps = React.HTMLAttributes<HTMLDivElement>

export const Board: React.FC<BoardProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <BoardProvider>
      <div
        {...props}
        className={`jeopardy-board ${className}`}>
        {children}
      </div>
    </BoardProvider>
  )
}
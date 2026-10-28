'use client'
import React from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { useGameState } from './Context'

export type ClueItemProps = React.HTMLAttributes<HTMLElement> & {
  /**
   * The clue ID
   */
  clueId: string
  /**
   * The value of the clue
   * @default 200
   */
  value?: number
}

export const ClueItem: React.FC<ClueItemProps> = ({
  clueId,
  value = 200,
  className,
  ...props
}) => {
  const { currency } = useGameState()

  return (
    <li
      {...props}
      className={clsx('jeopardy-clue', className)}>
      <Link
        href={`/clue/${clueId}`}
        className="jeopardy-clue__link">
        <span className="jeopardy-clue__currency">{currency}</span>
        <span className="jeopardy-clue__value">{value}</span>
      </Link>
    </li>
  )
}
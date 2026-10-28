'use client'
import React, {
  useCallback,
  useEffect
} from 'react'
import clsx from 'clsx'
import { useGameState } from './Context'

export type ClueProps = React.HTMLAttributes<HTMLElement> & {}

export const Clue: React.FC<ClueProps> = ({
  className,
  ...props
}) => {
  return (
    <div />
  )
}
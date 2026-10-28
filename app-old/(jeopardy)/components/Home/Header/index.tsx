'use client'
import React from 'react'
import clsx from 'clsx'
import { Logo } from './Logo'

export type HeaderProps = React.HTMLAttributes<HTMLElement>

export const Header: React.FC<HeaderProps> = ({
  className,
  ...props
}) => {
  return (
    <header
      {...props}
      className={clsx('jeopardy-header', className)}>
      <Logo />
    </header>
  )
}
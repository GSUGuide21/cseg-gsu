'use client'
import React from 'react'
import clsx from 'clsx'
import Image from 'next/image'

export type LogoProps = React.HTMLAttributes<HTMLDivElement>

export const Logo: React.FC<LogoProps> = ({ className, ...props }) => {
  return (
    <div {...props} className={clsx('jeopardy-logo', className)}>
      <span className="jeopardy-logo__text">CSEG</span>
      <span className="jeopardy-logo__container">
        <span className="sr-only">Jeopardy Logo</span>
        <Image
          src="/assets/logos/Jeopardy!_Logo.svg"
          alt="Jeopardy Logo"
          className='jeopardy-logo__image'
          fill />
      </span>
    </div>
  )
}
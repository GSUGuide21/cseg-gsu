'use client'
import React from 'react'
import clsx from 'clsx'

export type HeroProps = React.HTMLAttributes<HTMLElement>

export const Hero: React.FC<HeroProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <section
      {...props}
      className={clsx('page-hero', className)}
      role='banner'>
      <div className='page-hero__inner'>{children}</div>
    </section>
  )
}
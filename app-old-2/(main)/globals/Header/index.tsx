'use client'
import React from 'react'
import clsx from 'clsx'
import { useIntersectionContext } from '@/app-old-2/contexts'

type HeaderProps = React.HTMLAttributes<HTMLElement>

export const Header: React.FC<HeaderProps> = () => {
  const { hasHero, headerRef, isIntersecting } = useIntersectionContext()

  return (
    <header
      className={clsx('page-header', {
        'has-hero': hasHero,
        'is-intersecting': hasHero && isIntersecting,
      })}
      id='page-header'
      role='banner'
      ref={headerRef}>
      <nav className='page-navigation'>Page Navigation</nav>
      <div className='mobile-navigation'>Mobile Navigation</div>
    </header>
  )
}
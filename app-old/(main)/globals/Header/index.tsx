'use client'
import { useIntersectionContext } from '@/app-old/contexts'
import { MobileNavigation } from './MobileNavigation'
import { PageNavigation } from './PageNavigation'
import clsx from 'clsx'
import React from 'react'

type HeaderProps = React.HTMLAttributes<HTMLElement>

export const Header: React.FC<HeaderProps> = () => {
  const { 
    hasHero,
    headerRef,
    isIntersecting 
  } = useIntersectionContext()
  
  return (
    <header
      className={clsx('page-header', {
        'has-hero': hasHero,
        'is-intersecting': hasHero && isIntersecting,
      })}
      id='page-header'
      role='banner'
      ref={headerRef}>
      <PageNavigation />
      <MobileNavigation />
    </header>
  )
}
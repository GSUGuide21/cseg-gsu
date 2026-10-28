'use client'
import React from 'react'
import { Navigation, NavItem } from '.'
type NavigationListProps = React.HTMLAttributes<HTMLElement>

export const NavigationList: React.FC<NavigationListProps> = ({ 
  className,
  ...props 
}) => {
  return (
    <Navigation {...props} className={className}>
      <NavItem href="/" aria-current="page" label="Home" aria-label="Home" />
      <NavItem href="/about" label="About" aria-label="About" />
      <NavItem href="/blog" label="Blog" aria-label="Blog" />
    </Navigation>
  )
}

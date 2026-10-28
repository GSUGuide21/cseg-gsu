'use client'
import React from 'react'
import clsx from 'clsx'

type NavigationProps = React.HTMLAttributes<HTMLElement>

export { NavItem } from './NavItem'

export const Navigation: React.FC<NavigationProps> = ({ 
  className, 
  children,
  ...props 
}) => {
  return (
    <nav 
      {...props}
      role="navigation"
      className={clsx("page-header__nav navigation", className)}>
      <ul className="page-header__nav-list">
        {children}
      </ul>
    </nav>
  )
}
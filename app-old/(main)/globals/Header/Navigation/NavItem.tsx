'use client'
import React from 'react'
import Link from 'next/link'
import clsx from 'clsx'

type NavItemProps = React.HTMLAttributes<HTMLLIElement> & {
  href: string
  label: string
  isActive?: boolean
}

export const NavItem: React.FC<NavItemProps> = ({
  href,
  label,
  isActive = false,
  className,
  children,
  ...props
}) => {
  return (
    <li
      {...props}
      className={clsx('page-header__nav-item', className, {
        'is-active': isActive,
      })}>
      <Link href={href} className="page-header__nav-link">
        {label}
      </Link>
      {children && (
        <div className="page-header__nav-submenu">
          {children}
        </div>
      )}
    </li>
  )
}
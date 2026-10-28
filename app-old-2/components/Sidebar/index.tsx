'use client'
import React from 'react'
import clsx from 'clsx'

export type SidebarProps = React.HTMLAttributes<HTMLElement>

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <aside
      {...props}
      className={clsx('page-sidebar', className)}
      role='complementary'>
      <div className='page-sidebar__inner'>{children}</div>
    </aside>
  )
}
'use client'
import React from 'react'
import clsx from 'clsx'

export type SectionContentProps = React.HTMLAttributes<HTMLElement>

export const SectionContent: React.FC<SectionContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={clsx('page-section__content', className)}
      role='region'>
      {children}
    </div>
  )
}
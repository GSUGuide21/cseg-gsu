'use client'
import React from 'react'
import clsx from 'clsx'

export type SectionTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  before?: React.ReactNode
  after?: React.ReactNode
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  before,
  after,
  className,
  ...props
}) => {
  return (
    <React.Fragment>
      {before}
      <h2
        {...props}
        className={clsx('page-section__title', className)}
        role='heading'
        aria-level={2}>
        {children}
      </h2>
      {after}
    </React.Fragment>
  )
}
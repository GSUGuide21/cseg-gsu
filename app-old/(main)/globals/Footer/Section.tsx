'use client'
import React from 'react'
import clsx from 'clsx'

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  beforeLabel?: React.ReactNode
  afterLabel?: React.ReactNode
  label?: string
}

export const Section: React.FC<SectionProps> = ({
  className,
  beforeLabel,
  afterLabel,
  label,
  children,
  ...props
}) => {
  return (
    <section
      {...props}
      className={clsx('footer-section', className)}>
      {label && <h2 className="footer-section__title">
        {beforeLabel}
        <span className="footer-section__label">{label}</span>
        {afterLabel}
      </h2>}
      <div className="footer-section__inner">{children}</div>
    </section>
  )
}
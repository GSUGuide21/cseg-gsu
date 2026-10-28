'use client'
import React from 'react'
import clsx from 'clsx'

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
  /**
   * The title of the section
   * @default 'Section'
   */
  title?: string
  /**
   * The content before the section
   * @default ''
   */
  before?: string
  /**
   * The content after the section
   * @default ''
   */
  after?: string
  /**
   * Determines if the section is full width
   * @default false
   */
  fullWidth?: boolean
}

export const Section: React.FC<SectionProps> = ({
  title = 'Section',
  before = '',
  after = '',
  fullWidth = false,
  children,
  className,
  ...props
}) => (
  <section
    {...props}
    className={clsx('page-section', className, {
      'full-width': fullWidth,
      'has-title': !!title,
    })}>
    {before}
    {title && <h2 className="section-title">
      <span className="section-title__text">{title}</span>
    </h2>}
    <div className="section-content">{children}</div>
    {after}
  </section>
)
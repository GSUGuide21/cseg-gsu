'use client'
import React from "react"
import clsx from "clsx"

export type SectionProps = React.HTMLAttributes<HTMLElement>

export const Section: React.FC<SectionProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <section
      {...props}
      className={clsx("page-section", className)}
      role="region">
      <div className="page-section__inner">{children}</div>
    </section>
  )
}
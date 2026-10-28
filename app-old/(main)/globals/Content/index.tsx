'use client'
import React from 'react'

export { Section } from './Section'
type ContentProps = React.HTMLAttributes<HTMLElement>

export const Content: React.FC<ContentProps> = ({ children }) => {
  return (
    <main className="page-content" id="page-content" role="main">
      <div className="page-content__inner">{children}</div>
    </main>
  )
}
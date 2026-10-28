'use client'
import React from "react"

type ContentProps = React.HTMLAttributes<HTMLElement>

export const Content: React.FC<ContentProps> = ({ children, ...props }) => {
  return (
    <main className="page-content" id="page-content" role="main" {...props}>
      <div className="page-content__inner">{children}</div>
    </main>
  )
}
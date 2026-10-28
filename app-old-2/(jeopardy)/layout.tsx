import React, { type ReactNode } from 'react'

export type JeopardyLayoutProps = {
  children: ReactNode
}

export default function JeopardyLayout({
  children,
}: JeopardyLayoutProps) {
  return (
    <div className="jeopardy-layout">
      {children}
    </div>
  )
}
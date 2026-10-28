import React from 'react'

export type JeopardyLayoutProps = {
  children: React.ReactNode
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
'use client'
import React from 'react'
// import { useGameState } from './Context'
// import { uniqueId } from '@lib/util'

export type CategoryProps = React.HTMLAttributes<HTMLElement> & {
  /**
   * The title of the category
   * @default 'Category'
   */
  title?: string
}

export const Category: React.FC<CategoryProps> = ({
  title = 'Category',
  children,
  className,
  ...props
}) => {
  return (
    <nav
      {...props}
      className={`jeopardy-category ${className}`}>
      <h2 className="jeopardy-category__title">
        {title}
      </h2>
      <div className="jeopardy-category__content">
        {children}
      </div>
    </nav>
  )
}
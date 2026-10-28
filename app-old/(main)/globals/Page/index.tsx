'use client'
import React from 'react'
import clsx from 'clsx'
import { useThemeContext } from '@/app-old/contexts'
import { ThemeContextType } from '@/app-old/contexts/Theme'

export type PageWrapperProps = React.HTMLAttributes<HTMLElement>

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  const { isDarkMode } = useThemeContext() as ThemeContextType

  return (
    <div
      {...props}
      className={clsx('page', className, {
        'dark': isDarkMode,
      })}>
      {children}
    </div>
  )
}
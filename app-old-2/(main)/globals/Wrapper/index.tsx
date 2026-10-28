'use client'
import React from 'react'
import clsx from 'clsx'
import { useThemeContext } from '@/app-old-2/contexts'
import { ThemeContextType } from '@/app-old-2/contexts/Theme'

export type WrapperProps = React.HTMLAttributes<HTMLElement>

export const Wrapper: React.FC<WrapperProps> = ({
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
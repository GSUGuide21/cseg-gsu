'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import clsx from 'clsx'
import { useThemeContext } from '@/app-old/contexts'
import { ThemeContextType } from '@/app-old/contexts/Theme'

type LogoProps = React.HTMLAttributes<HTMLHeadingElement>

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  ...props 
}) => {
  const { isDarkMode } = useThemeContext() as ThemeContextType

  return (
    <h1 
      {...props}
      className={clsx("page-header__title", className)}>
      <Link className="page-header__title-link" href="#home" aria-label="Home">
        <Image 
          src={`/assets/logos/logo-${isDarkMode ? "wbl" : "blw"}.png`} 
          alt="Campus Survival and Engagement Group" 
          fill />
        <span className="sr-only">Campus Survival and Engagement Group</span>
      </Link>
    </h1>
  )
}
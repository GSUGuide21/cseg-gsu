'use client'
import React, {
  createContext, 
  useCallback,
  useContext, 
  useState,
  useEffect
} from 'react'

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
} from '../lib'

import { getImplicitTheme } from '../lib'

const canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

export type ThemeContextType = {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  theme: Theme
  isDarkMode: boolean
  isLightMode: boolean
  isSystem: boolean
}

export const isValidTheme = (theme: Theme): boolean => {
  return theme ? ['light', 'dark', 'system'].includes(theme) : false
}

export const ThemeContext = createContext<ThemeContextType | undefined>(void 0)
export const useThemeContext = () => useContext(ThemeContext)

export type ThemeProviderProps = React.HTMLProps<HTMLElement> & {
  defaultTheme?: Theme
  theme?: Theme
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = DEFAULT_THEME,
  theme: propTheme,
  ...props
}) => {
  const [theme, setThemeState] = useState<Theme>(getImplicitTheme(
    propTheme ? propTheme :
      (canUseDOM ? 
        document.documentElement.getAttribute('data-theme') as Theme :
        defaultTheme)
  ) || defaultTheme)
  const isDarkMode = theme === 'dark'
  const isLightMode = theme === 'light'
  const isSystem = theme === 'system'

  const setTheme = useCallback((themeToSet: Theme) => {
    if (isValidTheme(themeToSet)) {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeToSet)
      setTheme(getImplicitTheme(themeToSet))
      document.documentElement.setAttribute('data-theme', themeToSet)
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
      setTheme(getImplicitTheme(defaultTheme))
      document.documentElement.removeAttribute('data-theme')
    }
  }, [defaultTheme])

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'), 
    [theme, setTheme]
  )

  useEffect(() => {
    let themeToSet: Theme = propTheme || defaultTheme

    const preference = window.localStorage.getItem(THEME_STORAGE_KEY)

    if (!isValidTheme(preference as Theme)) {
      const implicitTheme = getImplicitTheme(themeToSet)
      themeToSet = implicitTheme ? implicitTheme : theme
    } else themeToSet = preference as Theme

    document.documentElement.setAttribute('data-theme', themeToSet)
    setThemeState(themeToSet)
  }, [propTheme, theme, defaultTheme])

  return (
    <ThemeContext.Provider
      {...props}
      value={{
        setTheme,
        toggleTheme,
        theme,
        isDarkMode,
        isLightMode,
        isSystem,
      }}>
      {children}
    </ThemeContext.Provider>
  )
}
'use client'
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
} from 'react'

import { 
  JeopardyMenuContextType,
  JeopardyMenuProviderProps
} from './types'
import { jeopardyMenuContextDefaults } from './config'

// Create the Jeopardy menu context
export const JeopardyMenuContext = createContext<JeopardyMenuContextType>(jeopardyMenuContextDefaults)

// Create a custom hook to use the Jeopardy menu context
export const useJeopardyMenuContext = () => {
  const context = useContext(JeopardyMenuContext)
  if (!context) throw new Error('useJeopardyMenuContext() must be used within a JeopardyMenuProvider')
  return context
}

// Create a provider component for the Jeopardy menu context
export const JeopardyMenuProvider: React.FC<JeopardyMenuProviderProps> = ({
  children,
  initialQuery = '',
  initialSelectedTags = [],
}) => {
  const [query, setQuery] = useState<string>(initialQuery)
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags)

  const value: JeopardyMenuContextType = useMemo(() => ({
    query,
    setQuery,
    selectedTags,
    setSelectedTags
  }), [query, selectedTags])

  return (
    <JeopardyMenuContext.Provider value={value}>
      {children}
    </JeopardyMenuContext.Provider>
  )
}
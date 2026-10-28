import React, { 
  Dispatch,
  ReactNode,
  SetStateAction,
} from 'react' 

// Jeopardy menu context configuration
export type JeopardyMenuContextType = {
  query: string // default: ''
  setQuery: Dispatch<SetStateAction<string>> // default: () => {}
  selectedTags: string[] // default: []
  setSelectedTags: Dispatch<SetStateAction<string[]>> // default: () => []
}

// Jeopardy menu provider props
export type JeopardyMenuProviderProps = {
  children: ReactNode // The children components to be rendered within the provider
  initialQuery?: string // Optional initial query string
  initialSelectedTags?: string[] // Optional initial selected tags array
}

// Jeopardy search props
export type JeopardyMenuSearchProps = React.HTMLAttributes<HTMLInputElement> & {
  label?: string // Optional label for the search input
  className?: string // Optional class name for styling
  placeholder?: string // Optional placeholder text for the search input
  onSearch?: (query: string) => void // Optional callback function to handle search queries
}

// Jeopardy game object type
export interface JeopardyGame {
  id: string // Unique identifier for the game
}

// Jeopardy game list props
export type JeopardyGameListProps = React.HTMLAttributes<HTMLElement> & {
  data: JeopardyGame[] // Array of game objects to be displayed in the list (default: [])
}
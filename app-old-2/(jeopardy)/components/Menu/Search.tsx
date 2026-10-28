'use client'
import React, { 
  useState,
  useCallback
} from 'react'
import clsx from 'clsx'
import { Search as SearchIcon } from 'lucide-react'
import { Input } from '@/app-old-2/components/UI/Input'
import { useJeopardyMenuContext } from './Context'
import { JeopardyMenuSearchProps } from './types'
import { Button } from '@/app-old-2/components/UI/Button'

export const JeopardyMenuSearch: React.FC<JeopardyMenuSearchProps> = ({
  className,
  label = 'Search',
  placeholder = 'Search...',
  onSearch, // Optional callback for search action
  ...props
}) => {
  const [focused, setFocused] = useState<boolean>(false)
  const { query, setQuery } = useJeopardyMenuContext()

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    onSearch?.(e.target.value) // Call the onSearch callback if provided
  }, [setQuery, onSearch])

  const handleFocus = useCallback(() => setFocused(true), [])
  const handleBlur = useCallback(() => setFocused(false), [])

  return (
    <div className={clsx('jeopardy-menu-search', className, {
      'has-placeholder': !!placeholder,
      'focused': focused
    })}>
      <Input
        {...props}
        id="jeopardy-menu-search"
        className="jeopardy-menu-search__input"
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur} />
      <Button
        variant="icon"
        className="jeopardy-menu-search__button"
        onClick={handleFocus}>
        <SearchIcon className="jeopardy-menu-search__icon" />
      </Button>
    </div>
  )
}
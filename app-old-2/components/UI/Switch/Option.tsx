'use client'
import React, {
  useCallback
} from 'react'
import clsx from 'clsx'
import { useSwitchContext } from './Context'
import { SwitchOptionProps } from './types'
import { Button } from '../Button'

export const SwitchOption: React.FC<SwitchOptionProps> = ({
  value,
  label,
  className,
  ...props
}) => {
  const { 
    setChecked, 
    handleChange, 
    checked, 
    disabled 
  } = useSwitchContext()

  const handleClick = useCallback(() => {
    if (disabled) return
    setChecked(value)
    handleChange?.(value)
  }, [disabled, setChecked, handleChange, value])

  return (
    <Button
      {...props}
      variant='text'
      size='small'
      className={clsx('switch-option', className, {
        'switch-option--active': checked === value,
        'switch-option--disabled': disabled
      })}
      onClick={handleClick}
      disabled={disabled}
      aria-checked={checked === value}
      tabIndex={disabled ? -1 : 0}
      role="option"
      data-value={value}>
      <span className="switch-option__label">{label}</span>
    </Button>
  )
}
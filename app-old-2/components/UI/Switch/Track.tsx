'use client'
import React, { useCallback } from 'react'
import clsx from 'clsx'
import { useSwitchContext } from './Context'
import { SwitchTrackProps } from './types'

export const SwitchTrack: React.FC<SwitchTrackProps> = ({
  className,
  ...props
}) => {
  const { 
    disabled, 
    focused, 
    checked,
    handleChange
  } = useSwitchContext()

  const toggleChecked = useCallback(() => handleChange(!checked), [handleChange, checked])

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (disabled) return
    event.preventDefault()
    toggleChecked()
  }, [disabled, toggleChecked])

  return (
    <div
      {...props}
      className={clsx('switch-track', className, {
        'switch-track--disabled': disabled,
        'switch-track--active': !disabled,
        'switch-track--focused': focused,
      })}
      onClick={handleClick}
      role="presentation">
      <div className="switch-track__fill" />
      <div className="switch-track__knob" />
    </div>
  )
}
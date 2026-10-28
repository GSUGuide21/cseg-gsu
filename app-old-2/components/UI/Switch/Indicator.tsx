'use client'
import React from 'react'
import clsx from 'clsx'
import { SwitchIndicatorProps } from './types'
import { useSwitchContext } from './Context'
import { SwitchOption } from './Option'
import { SwitchTrack } from './Track'
import { Field } from '../Field'

export const SwitchIndicator: React.FC<SwitchIndicatorProps> = ({
  className,
  ...props
}) => {
  const { 
    activeLabel,
    inactiveLabel,
    checked,
    disabled,
    showLabels,
    handleBlur,
    handleFocus,
    handleKeyDown 
  } = useSwitchContext()

  return (
    <Field
      {...props}
      className={clsx('switch-indicator', className)}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}>
      <SwitchTrack />
      {showLabels && <div className="switch-indicator__options">
        <SwitchOption value={false} label={inactiveLabel} />
        <SwitchOption value={true} label={activeLabel} />
      </div>}
    </Field>
  )
}

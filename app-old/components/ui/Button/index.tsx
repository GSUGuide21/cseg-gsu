'use client'
import React, {
  useCallback
} from 'react'
import clsx from 'clsx'
import { Poppins } from 'next/font/google'
import { Loader } from '@/app-old/components/ui/Loader'
import { 
  BUTTON_SIZES,
  BUTTON_VARIANTS
} from '@/app-old/lib/constants'
import './index.scss'

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin']
})

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: typeof BUTTON_VARIANTS[number]
  size?: keyof typeof BUTTON_SIZES
  isLoading?: boolean
  isFullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  isFullWidth = false,
  disabled = false,
  className,
  children,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}) => {
  const isValidSize = BUTTON_SIZES.hasOwnProperty(size)
  const isValidVariant = BUTTON_VARIANTS.includes(variant)

  const buttonSize = isValidSize ? size : 'medium'
  const buttonVariant = isValidVariant ? variant : 'primary'

  const isDisabled = buttonVariant === 'disabled' || disabled

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault()
      e.stopPropagation()
    }
    onClick?.(e)
  }, [isLoading, onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault()
      e.stopPropagation()
    }
    onKeyDown?.(e)
  }, [isLoading, onKeyDown])

  const handleFocus = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault()
      e.stopPropagation()
    }
    onFocus?.(e)
  }, [isLoading, onFocus])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault()
      e.stopPropagation()
    }
    onBlur?.(e)
  }, [isLoading, onBlur])

  return (
    <button
      {...props}
      className={clsx(
        'button',
        poppins.className,
        {
          [`button--variant-${buttonVariant}`]: buttonVariant !== 'primary',
          [`button--size-${buttonSize}`]: buttonSize !== 'medium' && !buttonSize.startsWith('icon-'),
          [`button--icon-${buttonSize}`]: buttonSize.startsWith('icon-'),
          'loading': isLoading,
          'full-width': isFullWidth,
        },
        className
      )}
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-busy={isLoading}
      aria-disabled={isLoading || isDisabled}
      disabled={isLoading || isDisabled}>
      {isLoading ? <Loader /> : children}
    </button>
  )
}
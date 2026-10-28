'use client'
import React, { useCallback } from 'react'
import clsx from 'clsx'
import { Poppins } from 'next/font/google'
import { Loader, LoaderWithText } from '@/app-old-2/components/UI/Loader'
import { BUTTON_SIZES, BUTTON_VARIANTS } from '@/app-old-2/lib/constants'
import { getButtonSize } from '@/app-old-2/lib/util'
import './index.scss'

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin']
})

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: typeof BUTTON_VARIANTS[number]
  size?: keyof typeof BUTTON_SIZES | number
  isLoading?: boolean
  isFullWidth?: boolean
  loaderText?: React.ReactNode // default: ''
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  disabled = false,
  loaderText = '',
  className,
  children,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}) => {
  const isValidSize = typeof size === 'number' || BUTTON_SIZES.hasOwnProperty(size)
  const isValidVariant = BUTTON_VARIANTS.includes(variant)

  const buttonSize = isValidSize ? size : BUTTON_SIZES.default
  const resolvedButtonSize = getButtonSize(buttonSize)

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
        className,
        {
          [`variant-${buttonVariant}`]: buttonVariant !== 'primary',
          [`size-${buttonSize}`]: typeof buttonSize === 'string' &&
            buttonSize !== 'medium' &&
            !buttonSize.startsWith('icon-'),
          [`icon-${buttonSize}`]: typeof buttonSize === 'string' &&
            buttonSize.startsWith('icon-'),
          loading: isLoading,
          'full-width': isFullWidth,
        }
      )}
      data-button-size={resolvedButtonSize}
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-busy={isLoading}
      aria-disabled={isLoading || isDisabled}
      disabled={isLoading || isDisabled}>
      {isLoading ? (loaderText ? <LoaderWithText text={loaderText} /> : <Loader />) : children}
    </button>
  )
}
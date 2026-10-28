'use client'
import React from 'react'
import clsx from 'clsx'
import { Loader, type LoaderProps } from './Main'

export type LoaderWithTextProps = LoaderProps & {
  text?: React.ReactNode // default: ''
}

export const LoaderWithText: React.FC<LoaderWithTextProps> = ({
  text = '',
  className,
  id,
  size,
  color,
  loading,
  ...props
}) => {
  return (
    <div 
      {...props}
      className={clsx('loader-container', className)}
      id={id}>
      <Loader className="loader__with-text" size={size} loading={loading} color={color} />
      <span className="loader__text">{text}</span>
    </div>
  )
}

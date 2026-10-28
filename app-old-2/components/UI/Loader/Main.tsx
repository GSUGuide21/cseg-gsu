'use client'
import React from 'react'
import clsx from 'clsx'
import { LOADER_SIZES } from '@/app-old-2/lib/constants'
import { getLoaderSize } from '@/app-old-2/lib/util'

export type LoaderProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: number | keyof typeof LOADER_SIZES // default: 24
  color?: string // default: '#000'
  loading?: boolean // default: true
}

export const Loader: React.FC<LoaderProps> = ({
  size = 24,
  color = '#000000',
  loading = true,
  className,
  ...props
}) => {
  /* const resolvedSize = typeof size === 'number' ? 
    size : 
    (LOADER_SIZES[size] || LOADER_SIZES.md) */
  const isValidSize = typeof size === 'number' || LOADER_SIZES.hasOwnProperty(size)
  const loaderSize = isValidSize ? size : LOADER_SIZES.default

  const resolvedSize = getLoaderSize(loaderSize)
  return (
    <span
      {...props}
      className={clsx('loader', className, {
        'loader--loading': loading,
        'loader--not-loading': !loading,
      })}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        borderColor: color,
      }}>
      <svg
        className="loader__svg"
        width={resolvedSize}
        height={resolvedSize}
        viewBox={`0 0 ${resolvedSize} ${resolvedSize}`}
        xmlns="http://www.w3.org/2000/svg">
        <circle
          className="loader__circle"
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={(resolvedSize - 4) / 2}
          stroke={color}
          fill="none"
          strokeWidth="4" />
        <path
          className="loader__path"
          d={`M${resolvedSize / 2} ${resolvedSize / 2} L${resolvedSize / 2} ${resolvedSize - 4}`}
          stroke={color}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round" />
        <path
          className="loader__path"
          d={`M${resolvedSize / 2} ${resolvedSize / 2} L${resolvedSize - 4} ${resolvedSize / 2}`}
          stroke={color}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round" />
      </svg>
    </span>
  )
}
'use client'
import React from 'react'
import clsx from 'clsx'

export type LoaderProps = React.HTMLAttributes<HTMLElement> & {
  size?: number // default: 24
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
  return (
    <div
      {...props}
      className={clsx('loader', className, {
        'loader--loading': loading,
        'loader--not-loading': !loading,
      })}
      style={{
        width: size,
        height: size,
        borderColor: color,
      }}>
      <svg
        className="loader__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg">
        <circle
          className="loader__circle"
          cx={size / 2}
          cy={size / 2}
          r={(size - 4) / 2}
          stroke={color}
          fill="none"
          strokeWidth="4" />
        <path
          className="loader__path"
          d={`M${size / 2} ${size / 2} L${size / 2} ${size - 4}`}
          stroke={color}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round" />
        <path
          className="loader__path"
          d={`M${size / 2} ${size / 2} L${size - 4} ${size / 2}`}
          stroke={color}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round" />
      </svg>
    </div>
  )
}
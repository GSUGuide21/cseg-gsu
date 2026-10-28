'use client'
import React from 'react'
import clsx from 'clsx'

type FooterProps = React.HTMLAttributes<HTMLElement>

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer
      className={clsx('page-footer')}
      id='page-footer'
      role='contentinfo'>
      <div className='page-footer__inner'>
        <p className='page-footer__text'>© 2023 Campus Survival and Engagement Group</p>
      </div>
    </footer>
  )
}
'use client'

import { useId, type FC, type ReactNode } from 'react'

/** Options under a heading; screen readers announce the heading on entering the group */
export const SelectGroup: FC<{ label: string; children: ReactNode }> = ({ label, children }) => {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="py-1 first:pt-0 last:pb-0">
      <div id={id} role="presentation" className="px-2.5 pt-1.5 pb-1 text-[0.7rem] font-bold tracking-wider text-muted uppercase">
        {label}
      </div>
      {children}
    </div>
  )
}

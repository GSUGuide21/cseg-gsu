'use client'

import { Printer } from 'lucide-react'
import type { FC } from 'react'

import { Button } from '@/components'

/** Opens the browser's print dialog, where "Save as PDF" is one of the printers */
export const PrintButton: FC = () => (
  <Button size="sm" leading={<Printer size={15} aria-hidden />} onClick={() => window.print()}>
    Print or save as PDF
  </Button>
)

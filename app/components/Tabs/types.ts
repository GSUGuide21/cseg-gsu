import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: ReactNode
  content: ReactNode
  /** An icon before the label */
  icon?: ReactNode
  /** A count after the label: "Members 24" */
  count?: number
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  /** Names the tab list: "Event details" */
  'aria-label': string
  /** The open tab's id (controlled); leave out to let it manage itself */
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  /** "line" underlines the open tab; "pill" fills it. Default "line". */
  appearance?: 'line' | 'pill'
  /**
   * "auto" opens a tab as the arrow keys reach it; "manual" waits for Enter or Space
   * (better when a tab is slow to show). Default "auto".
   */
  activation?: 'auto' | 'manual'
  /** Tabs share the width evenly */
  fitted?: boolean
  className?: string
  panelClassName?: string
}

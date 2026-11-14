'use client'

import { createContext, useContext } from 'react'

/** The editor's own views, which the toolbars and keyboard open: full screen, find and replace, and the shortcuts */
export interface EditorUI {
  fullscreen: boolean
  toggleFullscreen: () => void
  openFind: () => void
  openShortcuts: () => void
  /** Whether this editor takes comments (the page gave it somewhere to keep them) */
  commenting: boolean
  /** Starts a comment on the selected words */
  startComment: () => void
}

export const EditorUIContext = createContext<EditorUI>({ fullscreen: false, toggleFullscreen: () => {}, openFind: () => {}, openShortcuts: () => {}, commenting: false, startComment: () => {} })

export const useEditorUI = () => useContext(EditorUIContext)

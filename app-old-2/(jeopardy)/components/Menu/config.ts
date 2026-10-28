/**
 * Jeopardy Menu Configuration
 * This file contains the configuration for the Jeopardy menu component.
 * It defines the menu items, their properties, and the structure of the menu.
 * 
 * @module JeopardyMenuConfig
 * @version 1.0.0
 * @description
 * This module provides the configuration for the Jeopardy menu, including menu items,
 * their properties, and the structure of the menu.
 */
import type { JeopardyMenuContextType } from './types'

export const jeopardyMenuContextDefaults: JeopardyMenuContextType = {
  query: '', // Default query string
  setQuery: () => {}, // Default function to set query, no-op
  selectedTags: [], // Default selected tags array
  setSelectedTags: () => {}, // Default function to set selected tags, no-op
}
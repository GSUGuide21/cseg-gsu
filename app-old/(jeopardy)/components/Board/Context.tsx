/**
 * Jeopardy Game State Context
 * This context provides the game state and utility functions for the Jeopardy game.
 * It includes the current game state, currency, and functions to update the game state.
 * @module components/Board/Context
 */
'use client'
import React, {
  createContext,
  useContext,
  useState,
  useReducer,
  useCallback,
  ReactNode,
  Dispatch,
  SetStateAction
} from 'react'

import { uniqueId } from '@lib/utils'
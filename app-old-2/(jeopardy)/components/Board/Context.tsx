'use client'
import React, {
  createContext,
  useContext,
  // useState, 
  // useEffect,
  useReducer,
  ReactNode,
} from 'react'

export type Clue = {
  id: string | number
  question: string
  answer: string
  value: number
  categoryId: number
  isDailyDouble: boolean
}

export type Category = {
  id: string | number
  title: string
  clues: Clue[]
}

export type Team = {
  id: string | number
  name: string
  score: number
}

export type GameState = {
  categories: Category[]
  clues: Clue[]
  teams: Team[]
  currentClue: Clue | null
  currentTeam: Team | null
  currentRound: number
  isFinalJeopardy: boolean
}

export type GameStateAction =
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_CLUES'; payload: Clue[] }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_CURRENT_CLUE'; payload: Clue | null }
  | { type: 'SET_CURRENT_TEAM'; payload: Team | null }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'SET_IS_FINAL_JEOPARDY'; payload: boolean }
  | { type: 'RESET_GAME', payload: GameState }
  | { type: 'UPDATE_TEAM_SCORE'; payload: { teamId: number; score: number } }
  | { type: 'UPDATE_CLUE'; payload: Clue }
  | { type: 'SET_IS_DAILY_DOUBLE'; payload: { clueId: number; isDailyDouble: boolean } }
  | { type: 'SET_CURRENT_CLUE_ANSWERED'; payload: Clue }
  | { type: 'INITIALIZE_GAME'; payload: GameState }
  | { type: 'SET_CURRENT_TEAM_SCORE'; payload: number }
  | { type: 'SET_CURRENT_TEAM_NAME'; payload: string }

export type GameStateContextType = {
  gameState: GameState
  dispatch: React.Dispatch<GameStateAction>
  initializeGame: (initialState: GameState) => void
  resetGame: () => void
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  removeCategory: (categoryId: number) => void
  setClues: (clues: Clue[]) => void
  addClue: (clue: Clue) => void
  removeClue: (clueId: number) => void
  setTeams: (teams: Team[]) => void
  addTeam: (team: Team) => void
  removeTeam: (teamId: number) => void
  setCurrentClue: (clue: Clue | null) => void
  setCurrentTeam: (team: Team | null) => void
  setCurrentRound: (round: number) => void
  setIsFinalJeopardy: (isFinal: boolean) => void
  setIsDailyDouble: (clueId: number, isDailyDouble: boolean) => void
  setCurrentClueAnswered: (clue: Clue) => void
  setCurrentTeamScore: (score: number) => void
  setCurrentTeamName: (name: string) => void
  updateTeamScore: (teamId: number, score: number) => void
  updateClue: (clue: Clue) => void
  incrementTeamScore: (teamId: number, value: number) => void
  decrementTeamScore: (teamId: number, value: number) => void
}

export const GameStateContext = createContext<GameStateContextType | undefined>(undefined)

export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) throw new Error('useGameState must be used within a GameStateProvider')
  return context
}

export const initialGameState: GameState = {
  categories: [],
  clues: [],
  teams: [],
  currentClue: null,
  currentTeam: null,
  currentRound: 0,
  isFinalJeopardy: false,
}

export const gameStateReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'SET_CLUES':
      return { ...state, clues: action.payload }
    case 'SET_TEAMS':
      return { ...state, teams: action.payload }
    case 'SET_CURRENT_CLUE':
      return { ...state, currentClue: action.payload }
    case 'SET_CURRENT_TEAM':
      return { ...state, currentTeam: action.payload }
    case 'SET_CURRENT_ROUND':
      return { ...state, currentRound: action.payload }
    case 'SET_IS_FINAL_JEOPARDY':
      return { ...state, isFinalJeopardy: action.payload }
    case 'RESET_GAME':
      return action.payload
    case 'UPDATE_TEAM_SCORE': {
      const updatedTeams = state.teams.map((team) =>
        team.id === action.payload.teamId ? 
        { ...team, score: team.score + action.payload.score } : 
        team
      )
      return { ...state, teams: updatedTeams }
    }
    case 'UPDATE_CLUE': {
      const updatedClues = state.clues.map((clue) =>
        clue.id === action.payload.id ? 
        action.payload : 
        clue
      )
      return { ...state, clues: updatedClues }
    }
    case 'SET_IS_DAILY_DOUBLE': {
      const updatedClues = state.clues.map((clue) =>
        clue.id === action.payload.clueId ? 
        { ...clue, isDailyDouble: action.payload.isDailyDouble } : 
        clue
      )
      return { ...state, clues: updatedClues }
    }
    case 'SET_CURRENT_CLUE_ANSWERED': {
      const updatedClues = state.clues.map((clue) =>
        clue.id === action.payload.id ? 
        { ...clue, isAnswered: true } : 
        clue
      )
      return { ...state, clues: updatedClues }
    }
    case 'INITIALIZE_GAME':
      return action.payload
    case 'SET_CURRENT_TEAM_SCORE': {
      const updatedTeams = state.teams.map((team) =>
        team.id === state.currentTeam?.id ? 
        { ...team, score: action.payload } : 
        team
      )
      return { ...state, teams: updatedTeams }
    }
    case 'SET_CURRENT_TEAM_NAME': {
      const updatedTeams = state.teams.map((team) =>
        team.id === state.currentTeam?.id ? 
        { ...team, name: action.payload } : 
        team
      )
      return { ...state, teams: updatedTeams }
    }
    default:
      return state
  }
}

export const GameStateProvider: React.FC<{ 
  children: ReactNode,
  data: Partial<GameState>
}> = ({ children, data = [] }) => {
  const [gameState, dispatch] = useReducer(
    gameStateReducer, 
    { ...initialGameState, ...data }
  )

  const initializeGame = (initialState: GameState) => dispatch({ type: 'INITIALIZE_GAME', payload: initialState })

  const resetGame = () => dispatch({
    type: 'RESET_GAME',
    payload: initialGameState
  })

  const setCategories = (categories: Category[]) => dispatch({ type: 'SET_CATEGORIES', payload: categories })
  const addCategory = (category: Category) => dispatch({ 
    type: 'SET_CATEGORIES', 
    payload: [...gameState.categories, category] 
  })
  const removeCategory = (categoryId: number) => dispatch({ 
    type: 'SET_CATEGORIES', 
    payload: gameState.categories.filter((category) => category.id !== categoryId) 
  })

  const setClues = (clues: Clue[]) => dispatch({ type: 'SET_CLUES', payload: clues })
  const addClue = (clue: Clue) => dispatch({ 
    type: 'SET_CLUES', 
    payload: [...gameState.clues, clue] 
  })
  const removeClue = (clueId: number) => dispatch({ 
    type: 'SET_CLUES', 
    payload: gameState.clues.filter((clue) => clue.id !== clueId) 
  })

  const setTeams = (teams: Team[]) => dispatch({ type: 'SET_TEAMS', payload: teams })
  const addTeam = (team: Team) => dispatch({ 
    type: 'SET_TEAMS', 
    payload: [...gameState.teams, team] 
  })
  const removeTeam = (teamId: number) => dispatch({ 
    type: 'SET_TEAMS', 
    payload: gameState.teams.filter((team) => team.id !== teamId) 
  })

  const setCurrentClue = (clue: Clue | null) => dispatch({ type: 'SET_CURRENT_CLUE', payload: clue })
  const setCurrentTeam = (team: Team | null) => dispatch({ type: 'SET_CURRENT_TEAM', payload: team })
  const setCurrentRound = (round: number) => dispatch({ type: 'SET_CURRENT_ROUND', payload: round })
  const setIsFinalJeopardy = (isFinal: boolean) => dispatch({ type: 'SET_IS_FINAL_JEOPARDY', payload: isFinal })
  const setIsDailyDouble = (clueId: number, isDailyDouble: boolean) => dispatch({ type: 'SET_IS_DAILY_DOUBLE', payload: { clueId, isDailyDouble } })
  const setCurrentClueAnswered = (clue: Clue) => dispatch({ type: 'SET_CURRENT_CLUE_ANSWERED', payload: clue })
  const setCurrentTeamScore = (score: number) => dispatch({ type: 'SET_CURRENT_TEAM_SCORE', payload: score })
  const setCurrentTeamName = (name: string) => dispatch({ type: 'SET_CURRENT_TEAM_NAME', payload: name })
  const updateTeamScore = (teamId: number, score: number) => dispatch({ type: 'UPDATE_TEAM_SCORE', payload: { teamId, score } })
  const updateClue = (clue: Clue) => dispatch({ type: 'UPDATE_CLUE', payload: clue })

  const incrementTeamScore = (teamId: number, value: number) => dispatch({
    type: 'UPDATE_TEAM_SCORE',
    payload: { teamId, score: value },
  })

  const decrementTeamScore = (teamId: number, value: number) => dispatch({
    type: 'UPDATE_TEAM_SCORE',
    payload: { teamId, score: -value },
  })

  return (
    <GameStateContext.Provider
      value={{
        gameState,
        dispatch,
        initializeGame,
        resetGame,
        setCurrentClue,
        setCurrentTeam,
        setCurrentRound,
        setIsFinalJeopardy,
        setIsDailyDouble,
        setCurrentClueAnswered,
        setCurrentTeamScore,
        setCurrentTeamName,
        updateTeamScore,
        updateClue,
        incrementTeamScore,
        decrementTeamScore,
        setCategories,
        addCategory,
        removeCategory,
        setClues,
        addClue,
        removeClue,
        setTeams,
        addTeam,
        removeTeam,
      }}>
      {children}
    </GameStateContext.Provider>
  )
}
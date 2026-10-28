/**
 * Jeopardy Game State Context
 * This file contains the context and reducer for managing the game state of a Jeopardy game.
 * It includes types for clues, categories, teams, rounds, and the game state itself.
 */
import { 
  uniqueId, 
  // circle 
} from '@/app-old/lib/util'

import React, { 
  createContext, 
  useContext, 
  useReducer,
  useCallback
} from 'react'

export type Clue = {
  id?: string
  categoryId?: string
  question: string
  answer: string
  value?: number
  isDailyDouble?: boolean
  selected?: boolean
}

export type Category = {
  id?: string
  title: string
  clues: Clue[]
}

export type Team = {
  id: string
  name: string
  score: number
}

export type GameStatus = 
  | 'playing'
  | 'paused'
  | 'ended'
  | 'waiting'
  | 'initializing'
  | 'resetting'
  | 'finalJeopardy'
  | 'error'
  | 'none'

export type Round = {
  baseValue: number
  categories: Category[]
}

export type FinalJeopardy = {
  clue: string
  answer: string
}

export type RoundState = {
  id?: string
  title: string
  data: Round | FinalJeopardy
  isFinalJeopardy: boolean
}

export type FinalJeopardyWager = {
  teamId: string,
  wager: number
}

export type FinalJeopardyAnswer = {
  teamId: string,
  answer: string,
  isCorrect: boolean
}

export type FinalJeopardyState = {
  category: string,
  clue: string,
  answer: string,
  wagers: FinalJeopardyWager[],
  answers: FinalJeopardyAnswer[],
  isCompleted: boolean,
}

export type GameState = {
  teams: Team[],
  currentTeam: Team | null,
  currentRound: number,
  currentClue: Clue | null,
  gameStatus: GameStatus,
  rounds: RoundState[],
  clueSize: number,
  categorySize: number,
}

export type RoundData = {
  id: string,
  categories: Category[]
}

export type UpdateCategoryData = {
  id: string,
  categoryId: string,
  categoryData: Partial<Category>
}

export enum GameStateActionType {
  SET_CATEGORIES = 'SET_CATEGORIES',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY',
  SET_TEAMS = 'SET_TEAMS',
  SET_ROUNDS = 'SET_ROUNDS',
  SET_FINAL_JEOPARDY_STATE = 'SET_FINAL_JEOPARDY_STATE',
  UPDATE_FINAL_JEOPARDY_RESPONSE = 'UPDATE_FINAL_JEOPARDY_RESPONSE',
  COMPLETE_FINAL_JEOPARDY = 'COMPLETE_FINAL_JEOPARDY',
  SET_CURRENT_CLUE = 'SET_CURRENT_CLUE',
  SET_CURRENT_TEAM = 'SET_CURRENT_TEAM',
  SET_CURRENT_ROUND = 'SET_CURRENT_ROUND',
  SET_GAME_STATUS = 'SET_GAME_STATUS',
  SET_IS_FINAL_JEOPARDY = 'SET_IS_FINAL_JEOPARDY',
  RESET_GAME = 'RESET_GAME',
  UPDATE_TEAM_SCORE = 'UPDATE_TEAM_SCORE',
  UPDATE_CLUE = 'UPDATE_CLUE',
  SET_IS_DAILY_DOUBLE = 'SET_IS_DAILY_DOUBLE',
  SET_CURRENT_CLUE_ANSWERED = 'SET_CURRENT_CLUE_ANSWERED',
  INITIALIZE_GAME = 'INITIALIZE_GAME',
  SET_CURRENT_TEAM_SCORE = 'SET_CURRENT_TEAM_SCORE',
  SET_CURRENT_TEAM_NAME = 'SET_CURRENT_TEAM_NAME'
}

export type GameStatePayloadType = {
  'SET_CATEGORIES': RoundData
  'UPDATE_CATEGORY': UpdateCategoryData
  'SET_TEAMS': Team[]
  'SET_ROUNDS': RoundState[]
  'SET_FINAL_JEOPARDY_STATE': FinalJeopardyState
  'UPDATE_FINAL_JEOPARDY_RESPONSE': FinalJeopardyAnswer[]
  'COMPLETE_FINAL_JEOPARDY': FinalJeopardyState
  'SET_CURRENT_CLUE': Clue | null
  'SET_CURRENT_TEAM': Team | null
  'SET_CURRENT_ROUND': number
  'SET_GAME_STATUS': GameStatus
  'SET_IS_FINAL_JEOPARDY': boolean
  'RESET_GAME': GameState
  'UPDATE_TEAM_SCORE': { teamId: string; score: number }
  'UPDATE_CLUE': Clue
  'SET_IS_DAILY_DOUBLE': { clueId: string; isDailyDouble: boolean }
  'SET_CURRENT_CLUE_ANSWERED': Clue
  'INITIALIZE_GAME': GameState
  'SET_CURRENT_TEAM_SCORE': number
  'SET_CURRENT_TEAM_NAME': string
}

export type GameStateAction<T extends GameStateActionType> = {
  type: T
  payload: GameStatePayloadType[T]
}

export type GameStateContextType = {
  // The currency symbol used in the game
  currency: string
  // The current game state
  gameState: GameState  
  // Dispatch function to update the game state
  dispatch: React.Dispatch<GameStateAction<GameStateActionType>>
  // Function to initialize the game state
  initializeGame: (gameState: GameState) => void
  // Function to reset the game state
  resetGame: () => void
  // Function to pause the game
  pauseGame: () => void
  // Function to stop the game
  stopGame: () => void
  // Sets the game status
  setGameStatus: (status: GameStatus) => void
  // Function to set the rounds
  setRounds: (rounds: RoundState[]) => void
  // Function to add a round (for example, when a new round is created)
  addRound: (round: RoundState) => void
  // Function to set the current round
  setCurrentRound: (round: number) => void
  // Function to get the current round
  getCurrentRound: () => RoundState | null
  // Sets the value when it's a daily double
  setIsDailyDouble: (clueId: string, isDailyDouble: boolean) => void
  // Sets the value when it's Final Jeopardy
  setIsFinalJeopardy: (isFinalJeopardy: boolean) => void
  // Function to set the final jeopardy state
  setFinalJeopardyState: (finalJeopardyState: FinalJeopardyState) => void
  // Function to update the final jeopardy response
  updateFinalJeopardyResponse: (response: FinalJeopardyAnswer[]) => void
  // Function to complete the final jeopardy
  completeFinalJeopardy: (finalJeopardyState: FinalJeopardyState) => void
  // Function to set the categories
  setCategories: (categories: Category[], id: string) => void
  // Function to get categories from current round
  getCategories: () => Category[] | null
  // Function to add a category (for example, when a new category is created)
  addCategory: (category: Category, id: string) => void
  // Update the category
  updateCategory: (id: string, categoryId: string, categoryData: Partial<Category>) => void
  // Function to set the clues
  setClues: (clues: Clue[], categoryId: string) => void
  // Function to add a clue (for example, when a new clue is created)
  addClue: (clue: Clue, categoryId: string) => void
  // Function to set the teams
  setTeams: (teams: Team[]) => void
  // Function to add a team (for example, when a new team is created)
  addTeam: (team: Team) => void
  // Function to remove a team (for example, when a team is eliminated)
  removeTeam: (teamId: string) => void
  // Finds a team by ID
  findTeamById: (teamId: string) => Team | undefined
  // Sets the current team
  setCurrentTeam: (team: Team | null) => void
  // Sets the current team score
  setCurrentTeamScore: (score: number) => void
  // Sets the current team name
  setCurrentTeamName: (name: string) => void
  // Updates the team score 
  updateTeamScore: (teamId: string, score: number) => void
  // Increments the team score
  incrementTeamScore: (teamId: string, value: number) => void
  // Decrements the team score
  decrementTeamScore: (teamId: string, value: number) => void
  // Finds a category by ID
  findCategoryById: (categoryId: string) => Category | null | undefined
  // Finds a category by title
  findCategoryByTitle: (title: string) => Category | null | undefined
  // Finds a clue by ID
  findClueById: (clueId: string, categoryId?: string | undefined) => Clue | null | undefined
  // Sets the current clue
  setCurrentClue: (clue: Clue | null) => void
  // Updates the clue
  updateClue: (clue: Clue) => void
  // Verifies clue size
  verifyClueSize: (clueSize: number) => void
  // Verifies category size
  verifyCategorySize: (categorySize: number) => void
}

// Create a context for the game state
export const GameStateContext = createContext<GameStateContextType | undefined>(undefined)

// Custom hook to use the game state context
export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) throw new Error('useGameState must be used within a GameStateProvider.')
  return context
}

// Initial game state
export const initialGameState: GameState = {
  teams: [],
  currentTeam: null,
  currentRound: 0,
  currentClue: null,
  gameStatus: 'none',
  rounds: [],
  clueSize: 5,
  categorySize: 6
}

// Game state reducer
export const gameStateReducer = <T extends GameStateActionType>(
  state: GameState, 
  action: GameStateAction<T>
): GameState => {
  switch (action.type) {
    case GameStateActionType.SET_ROUNDS:
      const rounds = action.payload as GameStatePayloadType['SET_ROUNDS']
      return { ...state, rounds }
      
    case GameStateActionType.SET_CATEGORIES: {
      const { id, categories } = action.payload as GameStatePayloadType['SET_CATEGORIES']
      const updatedRounds = state.rounds.map(round => {
        if (round.id !== id) return round
        return {
          ...round,
          data: {
            ...round.data,
            categories
          }
        } as RoundState
      })
      return { ...state, rounds: updatedRounds }
    }

    case GameStateActionType.UPDATE_CATEGORY: {
      const data = action.payload as GameStatePayloadType['UPDATE_CATEGORY']
      const { id, categoryId, categoryData } = data
      const targetRound = state.rounds.find(round => round.id === id)
      if (!targetRound || targetRound.isFinalJeopardy) return state

      const roundData = targetRound.data as Round
      if (!roundData) return state

      const targetCategory = roundData.categories.find(category => category.id === categoryId)
      if (!targetCategory) return state

      const updatedCategory = {
        ...targetCategory,
        ...categoryData
      }

      const updatedRounds = state.rounds.map(round => {
        if (round.id !== id) return round
        return {
          ...round,
          data: {
            ...round.data,
            categories: roundData.categories.map(category => 
              category.id === categoryId ? updatedCategory : category
            )
          }
        } as RoundState
      })

      return { ...state, rounds: updatedRounds }
    }

    case GameStateActionType.SET_TEAMS:
      const teams = action.payload as GameStatePayloadType['SET_TEAMS']
      return { ...state, teams }

    case GameStateActionType.SET_FINAL_JEOPARDY_STATE:
      const finalJeopardyState = action.payload as GameStatePayloadType['SET_FINAL_JEOPARDY_STATE']
      return { 
        ...state, 
        rounds: state.rounds.map(round => {
          if (!round.isFinalJeopardy) return round
          return {
            ...round,
            data: finalJeopardyState
          } as RoundState
        }) 
      }

    case GameStateActionType.UPDATE_FINAL_JEOPARDY_RESPONSE:
      const finalJeopardyResponse = action.payload as GameStatePayloadType['UPDATE_FINAL_JEOPARDY_RESPONSE']
      return { 
        ...state, 
        rounds: state.rounds.map(round => {
          if (!round.isFinalJeopardy) return round
          const data = round.data as FinalJeopardyState
          const updatedAnswers = data.answers.map(answer => {
            const updatedAnswer = finalJeopardyResponse.find(a => a.teamId === answer.teamId)
            if (!updatedAnswer) return answer
            return {
              ...answer,
              isCorrect: updatedAnswer.isCorrect,
              answer: updatedAnswer.answer
            }
          }) as FinalJeopardyAnswer[]

          return {
            ...round,
            data: {
              ...round.data,
              answers: updatedAnswers
            } as FinalJeopardyState
          } as RoundState
        }) 
      }

    case GameStateActionType.COMPLETE_FINAL_JEOPARDY:
      const completedFinalJeopardy = action.payload as GameStatePayloadType['COMPLETE_FINAL_JEOPARDY']
      return { 
        ...state, 
        rounds: state.rounds.map(round => {
          if (!round.isFinalJeopardy) return round
          return {
            ...round,
            data: completedFinalJeopardy
          } as RoundState
        }) 
      }

    case GameStateActionType.SET_CURRENT_CLUE:
      const currentClue = action.payload as GameStatePayloadType['SET_CURRENT_CLUE']
      return { ...state, currentClue }

    case GameStateActionType.SET_CURRENT_TEAM:
      const currentTeam = action.payload as GameStatePayloadType['SET_CURRENT_TEAM']
      return { ...state, currentTeam }

    case GameStateActionType.SET_CURRENT_ROUND:
      const currentRound = action.payload as GameStatePayloadType['SET_CURRENT_ROUND']
      return { ...state, currentRound }

    case GameStateActionType.SET_GAME_STATUS:
      const gameStatus = action.payload as GameStatePayloadType['SET_GAME_STATUS']
      return { ...state, gameStatus }

    case GameStateActionType.SET_IS_FINAL_JEOPARDY:
      const isFinalJeopardy = action.payload as GameStatePayloadType['SET_IS_FINAL_JEOPARDY']
      return { ...state, rounds: state.rounds.map(round => ({ ...round, isFinalJeopardy })) }

    case GameStateActionType.RESET_GAME:
      const resetGameState = action.payload as GameStatePayloadType['RESET_GAME']
      return { ...state, ...resetGameState }

    case GameStateActionType.UPDATE_TEAM_SCORE: {
      const { teamId, score } = action.payload as GameStatePayloadType['UPDATE_TEAM_SCORE']
      const updatedTeams = state.teams.map(team =>
        team.id === teamId ? { ...team, score } : team
      )
      return { ...state, teams: updatedTeams }
    }

    case GameStateActionType.UPDATE_CLUE: {
      const updatedClue = action.payload as GameStatePayloadType['UPDATE_CLUE']
      const updatedClues = state.rounds.map(round => {
        if (round.isFinalJeopardy) return round
        const categories = (round.data as Round).categories
        return {
          ...round,
          data: {
            ...round.data,
            categories: categories.map(category => ({
              ...category,
              clues: category.clues.map(clue =>
                clue.id === updatedClue.id ? updatedClue : clue
              )
            }))
          }
        } as RoundState
      })
      return { ...state, rounds: updatedClues }
    }

    case GameStateActionType.SET_IS_DAILY_DOUBLE: {
      const { clueId, isDailyDouble } = action.payload as GameStatePayloadType['SET_IS_DAILY_DOUBLE']
      const updatedClues = state.rounds.map(round => {
        if (round.isFinalJeopardy) return round
        const categories = (round.data as Round).categories
        return {
          ...round,
          data: {
            ...round.data,
            categories: categories.map(category => ({
              ...category,
              clues: category.clues.map(clue =>
                clue.id === clueId ? { ...clue, isDailyDouble } : clue
              )
            }))
          }
        } as RoundState
      })
      return { ...state, rounds: updatedClues }
    }

    case GameStateActionType.SET_CURRENT_CLUE_ANSWERED: {
      const answeredClue = action.payload as GameStatePayloadType['SET_CURRENT_CLUE_ANSWERED']
      const updatedClues = state.rounds.map(round => {
        if (round.isFinalJeopardy) return round
        const categories = (round.data as Round).categories
        return {
          ...round,
          data: {
            ...round.data,
            categories: categories.map(category => ({
              ...category,
              clues: category.clues.map(clue =>
                clue.id === answeredClue.id ? { ...clue, selected: true } : clue
              )
            }))
          }
        } as RoundState
      })
      return { ...state, rounds: updatedClues }
    }

    case GameStateActionType.INITIALIZE_GAME:
      return { ...state, ...action.payload as GameStatePayloadType['INITIALIZE_GAME'] }

    case GameStateActionType.SET_CURRENT_TEAM_SCORE: {
      const updatedTeams = state.teams.map(team =>
        team.id === state.currentTeam?.id ? { ...team, score: action.payload as GameStatePayloadType['SET_CURRENT_TEAM_SCORE'] } : team
      )
      return { ...state, teams: updatedTeams }
    }

    case GameStateActionType.SET_CURRENT_TEAM_NAME: {
      const updatedTeams = state.teams.map(team =>
        team.id === state.currentTeam?.id ? { ...team, name: action.payload as GameStatePayloadType['SET_CURRENT_TEAM_NAME'] } : team
      )
      return { ...state, teams: updatedTeams }
    }

    default:
      return state
  }
}

export type GameStateProviderProps = Omit<React.ProviderProps<GameStateContextType>, 'value'> & {
  currency?: string // The currency symbol used in the game (default: '$')
  data: Partial<GameState>
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({
  children,
  currency = '$', // Default currency symbol
  data = {}
}) => {
  // Initialize the game state with provided data or defaults
  const defaultRounds = data.rounds || initialGameState.rounds || []
  
  const roundsWithClueValues = defaultRounds.map(round => {
    if (round.isFinalJeopardy) return round

    const roundData = round.data as Round
    if (!roundData || !roundData.categories) return round

    const {
      categories,
      baseValue = 200 // Default base value if not provided
    } = roundData

    const clueSize = data.clueSize || initialGameState.clueSize
    const categorySize = data.categorySize || initialGameState.categorySize

    const updatedCategories = categories.slice(0, categorySize).map(category => ({
      ...category,
      clues: category.clues.slice(0, clueSize).map((clue, index) => ({
        ...clue,
        id: clue.id ?? `${category.id}-${index + 1}`, // Generate unique ID if not provided
        value: clue.value ?? (baseValue * (index + 1)), // Set value if not provided
      }))
    }))

    return {
      ...round,
      data: {
        ...roundData,
        categories: updatedCategories
      }
    }
  })

  const [gameState, dispatch] = useReducer(
    gameStateReducer, 
    { 
      ...initialGameState, 
      ...data,
      rounds: roundsWithClueValues
    }
  )

  const { categorySize, clueSize } = gameState

  // Sets the game status
  const setGameStatus = useCallback((status: GameStatus) => dispatch({ type: GameStateActionType.SET_GAME_STATUS, payload: status }), [])

  // Finds a team by ID
  const findTeamById = useCallback((teamId: string) => gameState.teams.find(team => team.id === teamId), [gameState.teams])

  // Sets the categories
  const setCategories = useCallback((categories: Category[], id: string) => {
    dispatch({ type: GameStateActionType.SET_CATEGORIES, payload: { categories, id } })
  }, [])

  // Updates a category
  const updateCategory = useCallback((id: string, categoryId: string, categoryData: Partial<Category>) => {
    dispatch({ type: GameStateActionType.UPDATE_CATEGORY, payload: { id, categoryId, categoryData } })
  }, [])

  // Adds a category
  const addCategory = useCallback((category: Category, id: string) => {
    const round = gameState.rounds.find(round => round.id === id)
    if (!round) return
    const roundData = round.data as Round
    if (!roundData) return
    dispatch({ 
      type: GameStateActionType.SET_CATEGORIES, 
      payload: { id, categories: [...roundData.categories, category] } 
    })
  }, [gameState.rounds])

  // Finds a category by ID
  const findCategoryById = useCallback((categoryId: string) => {
    const round = gameState.rounds.find(round => {
      if (round.isFinalJeopardy) return false
      const categories = (round.data as Round).categories
      return categories.some(category => category.id === categoryId)
    })

    if (!round) return null

    const categories = (round.data as Round).categories
    return categories.find(category => category.id === categoryId)
  }, [gameState.rounds])

  // Finds a category by title
  const findCategoryByTitle = useCallback((title: string) => {
    const round = gameState.rounds.find(round => {
      if (round.isFinalJeopardy) return false
      const categories = (round.data as Round).categories
      return categories.some(category => category.title === title)
    })

    if (!round) return null

    const categories = (round.data as Round).categories
    return categories.find(category => category.title === title)
  }, [gameState.rounds])

  // Finds a clue by ID
  const findClueById = useCallback((clueId: string, categoryId?: string) => {
    if (!clueId) return null
    if (!categoryId) {
      const round = gameState.rounds.find(round => {
        if (round.isFinalJeopardy) return false
        const categories = (round.data as Round).categories
        return categories.some(category => category.clues.some(clue => clue.id === clueId))
      })
      if (!round) return null
      const categories = (round.data as Round).categories
      const category = categories.find(category => category.clues.some(clue => clue.id === clueId))

      if (!category) return null
      return category.clues.find(clue => clue.id === clueId)
    }

    const category = findCategoryById(categoryId)
    if (!category) return null
    return category.clues.find(clue => clue.id === clueId)
  }, [gameState.rounds, findCategoryById])

  // Initializes the game state
  const initializeGame = useCallback((initialState: GameState) => {
    setGameStatus('initializing')
    dispatch({ type: GameStateActionType.INITIALIZE_GAME, payload: initialState })
  }, [setGameStatus])

  // Resets the game state
  const resetGame = useCallback(() => {
    setGameStatus('resetting')
    dispatch({ type: GameStateActionType.RESET_GAME, payload: initialGameState })
  }, [setGameStatus])

  // Pauses the game
  const pauseGame = useCallback(() => {
    setGameStatus('paused')
  }, [setGameStatus])

  // Stops the game
  const stopGame = useCallback(() => {
    setGameStatus('ended')
    dispatch({ type: GameStateActionType.RESET_GAME, payload: initialGameState })
    setGameStatus('none')
  }, [setGameStatus])

  // Sets the rounds
  const setRounds = useCallback((rounds: RoundState[]) => {
    dispatch({ type: GameStateActionType.SET_CATEGORIES, payload: rounds })
  }, [])

  // Adds a round
  const addRound = useCallback((round: RoundState) => {
    dispatch({ type: GameStateActionType.SET_CATEGORIES, payload: [...gameState.rounds, round] })
  }, [gameState.rounds])

  // Randomizes clues
  const randomizeClues = useCallback((clues: Clue[], length?: number) => {
    return clues
      .sort(() => Math.random() - 0.5)
      .slice(0, length || clues.length)
  }, [])

  // Generates empty clues
  const generateEmptyClues = useCallback((categoryId: string, count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `${categoryId}-${index + 1}-${uniqueId()}`,
      question: '',
      answer: '',
      value: 0,
      categoryId,
      isDailyDouble: false,
      selected: false
    }))
  }, [])

  // Sets the clues
  const setClues = useCallback((clues: Clue[], categoryId: string) => {
    if (!clueSize || !categorySize) return

    let updatedClues = clues
    if (clues.length < clueSize) {
      const delta = clueSize - clues.length
      const emptyClues = generateEmptyClues(categoryId, delta)
      updatedClues = [...clues, ...emptyClues]
    } else if (clues.length > clueSize) updatedClues = randomizeClues(clues, clueSize)

    const updatedData = gameState.rounds.map(round => {
      if (round.isFinalJeopardy) return round
      const roundData = round.data as Round
      if (!roundData) return round
      const { categories, baseValue } = roundData
      return {
        ...round,
        data: {
          ...round.data,
          categories: categories.map(category => 
            category.id === categoryId ?
            {
              ...category,
              clues: updatedClues.map((clue, index) => ({
                ...clue,
                id: `${categoryId}-${index + 1}-${uniqueId()}`,
                value: baseValue * (index + 1),
              }))
            } :
            category)
        }
      } as RoundState
    })

    dispatch({ 
      type: GameStateActionType.SET_CATEGORIES, 
      payload: updatedData
    })
  }, [clueSize, categorySize, generateEmptyClues, randomizeClues, gameState.rounds])

  // Adds a clue
  const addClue = useCallback((clue: Clue, categoryId: string) => {
    const updatedData = gameState.rounds.map(round => {
      if (round.isFinalJeopardy) return round
      const { categories, baseValue } = round.data as Round
      const targetCategory = categories.find(category => category.id === categoryId)
      if (!targetCategory) return round

      const newClue = {
        ...clue,
        id: `${categoryId}-${targetCategory.clues.length + 1}-${uniqueId()}`,
        value: (targetCategory.clues.length + 1) * baseValue
      }
      
      return {
        ...round,
        data: {
          ...round.data,
          categories: categories.map(category => category.id === categoryId ? {
            ...category,
            clues: [...category.clues, newClue]
          } : category)
        }
      } as RoundState
    })

    dispatch({ 
      type: GameStateActionType.SET_CATEGORIES, 
      payload: updatedData 
    })
  }, [gameState.rounds])

  // Sets the teams
  const setTeams = useCallback((teams: Team[]) => {
    dispatch({ type: GameStateActionType.SET_TEAMS, payload: teams })
  }, [])

  // Adds a team
  const addTeam = useCallback((team: Team) => {
    dispatch({ type: GameStateActionType.SET_TEAMS, payload: [...gameState.teams, team] })
  }, [gameState.teams])

  // Removes a team
  const removeTeam = useCallback((teamId: string) => {
    dispatch({ type: GameStateActionType.SET_TEAMS, payload: gameState.teams.filter(team => team.id !== teamId) })
  }, [gameState.teams])

  // Sets the current team
  const setCurrentClue = useCallback((clue: Clue | null) => {
    dispatch({ type: GameStateActionType.SET_CURRENT_CLUE, payload: clue })
  }, [])

  // Sets the current team
  const setCurrentTeam = useCallback((team: Team | null) => {
    dispatch({ type: GameStateActionType.SET_CURRENT_TEAM, payload: team })
  }, [])

  // Sets the current team score
  const setCurrentTeamScore = useCallback((score: number) => {
    dispatch({ type: GameStateActionType.SET_CURRENT_TEAM_SCORE, payload: score })
  }, [])

  // Sets the current team name
  const setCurrentTeamName = useCallback((name: string) => {
    dispatch({ type: GameStateActionType.SET_CURRENT_TEAM_NAME, payload: name })
  }, [])

  // Updates the team score
  const updateTeamScore = useCallback((teamId: string, score: number) => {
    dispatch({ type: GameStateActionType.UPDATE_TEAM_SCORE, payload: { teamId, score } })
  }, [])

  // Increments the team score
  const incrementTeamScore = useCallback((teamId: string, value: number) => {
    if (!teamId) return
    const currentTeam = findTeamById(teamId)
    if (!currentTeam) return
    updateTeamScore(teamId, currentTeam.score + value)
  }, [findTeamById, updateTeamScore])

  // Decrements the team score
  const decrementTeamScore = useCallback((teamId: string, value: number) => {
    if (!teamId) return
    const currentTeam = findTeamById(teamId)
    if (!currentTeam) return
    updateTeamScore(teamId, currentTeam.score - value)
  }, [findTeamById, updateTeamScore])

  // Sets the current round
  const setCurrentRound = useCallback((round: number) => {
    dispatch({ type: GameStateActionType.SET_CURRENT_ROUND, payload: round })
  }, [])

  // Gets the current round
  const getCurrentRound = useCallback(() => {
    const currentRound = gameState.rounds[gameState.currentRound]
    return currentRound ? currentRound : null
  }, [gameState.rounds, gameState.currentRound])

  // Gets the categories from the current round
  const getCategories = useCallback(() => {
    const currentRound = getCurrentRound()
    if (!currentRound || currentRound.isFinalJeopardy) return null
    const categories = (currentRound.data as Round).categories
    return categories
  }, [getCurrentRound])

  // Sets the Daily Double state
  const setIsDailyDouble = useCallback((clueId: string, isDailyDouble: boolean) => {
    dispatch({ type: GameStateActionType.SET_IS_DAILY_DOUBLE, payload: { clueId, isDailyDouble } })
  }, [])

  // Sets the value when the Final Jeopardy state occurs
  const setIsFinalJeopardy = useCallback((isFinalJeopardy: boolean) => {
    dispatch({ type: GameStateActionType.SET_IS_FINAL_JEOPARDY, payload: isFinalJeopardy })
    setGameStatus('finalJeopardy')
  }, [setGameStatus])

  // Sets the Final Jeopardy state
  const setFinalJeopardyState = useCallback((finalJeopardyState: FinalJeopardyState) => {
    dispatch({ type: GameStateActionType.SET_FINAL_JEOPARDY_STATE, payload: finalJeopardyState })
  }, [])

  // Updates the Final Jeopardy response
  const updateFinalJeopardyResponse = useCallback((response: FinalJeopardyAnswer[]) => {
    dispatch({ type: GameStateActionType.UPDATE_FINAL_JEOPARDY_RESPONSE, payload: response })
  }, [])

  // Completes the Final Jeopardy
  const completeFinalJeopardy = useCallback((finalJeopardyState: FinalJeopardyState) => {
    dispatch({ type: GameStateActionType.COMPLETE_FINAL_JEOPARDY, payload: finalJeopardyState })
  }, [])

  // Updates the clue
  const updateClue = useCallback((clue: Clue) => {
    dispatch({ type: GameStateActionType.UPDATE_CLUE, payload: clue })
  }, [])

  // Verifies clue size
  const verifyClueSize = useCallback((clueSize: number) => {
    if (clueSize < 1) throw new Error('Clue size must be greater than 0')
    if (clueSize > 5) throw new Error('Clue size must be less than or equal to 5')
    return clueSize
  }, [])

  // Verifies category size
  const verifyCategorySize = useCallback((categorySize: number) => {
    if (categorySize < 1) throw new Error('Category size must be greater than 0')
    if (categorySize > 6) throw new Error('Category size must be less than or equal to 6')
    return categorySize
  }, [])

  // Value to be passed to the context
  const value = {
    currency,
    gameState,
    dispatch,
    initializeGame,
    resetGame,
    pauseGame,
    stopGame,
    setGameStatus,
    setClues,
    addClue,
    findTeamById,
    setCategories,
    getCategories,
    addCategory,
    updateCategory,
    findCategoryById,
    findCategoryByTitle,
    setTeams,
    addTeam,
    removeTeam,
    setRounds,
    addRound,
    setCurrentRound,
    getCurrentRound,
    setIsDailyDouble,
    setIsFinalJeopardy,
    setFinalJeopardyState,
    updateFinalJeopardyResponse,
    completeFinalJeopardy,
    updateClue,
    setCurrentClue,
    findClueById,
    setCurrentTeam,
    setCurrentTeamScore,
    updateTeamScore,
    incrementTeamScore,
    decrementTeamScore,
    setCurrentTeamName,
    verifyCategorySize,
    verifyClueSize
  }

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  )
}
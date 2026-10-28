import React, {
  Dispatch,
  SetStateAction
} from 'react'

export interface Clue {
  id: string // Unique identifier for the clue
  question: string // The question or prompt for the clue
  answer: string // The answer to the clue
  value: number // The point value of the clue
  categoryId: string // The ID of the category this clue belongs to
  isDailyDouble?: boolean // Optional flag indicating if this clue is a Daily Double
  selected?: boolean // Optional flag indicating if the clue is selected
  answered?: boolean // Optional flag indicating if the clue has been answered
}

export interface Category {
  id: string // Unique identifier for the category
  title: string // The title of the category
  clues: Clue[] // Array of clues associated with this category
}

export interface Team {
  id: string // Unique identifier for the team
  name: string // The name of the team
  score: number // The current score of the team
  inFinalJeopardy?: boolean // Optional flag indicating if the team is in Final Jeopardy
  isActive?: boolean // Optional flag indicating if the team is currently active (default: true)
  wager?: number // Optional wager for the team, used in Final Jeopardy
}

export interface BaseRound {
  id: string // Unique identifier for the round
  title: string // The title of the round
  isFinalJeopardy: boolean // Flag indicating if this is a Final Jeopardy round
}

export interface Round extends BaseRound {
  baseValue: number // The base value for clues in this round
  categories: Category[] // Array of categories for this round
}

export interface FinalJeopardy extends BaseRound {
  clue: string // The Final Jeopardy clue
  answer: string // The answer to the Final Jeopardy clue
}

export type RoundType = 
  | 'regular'
  | 'finalJeopardy'
  | 'none'

export type RoundState = 
  | { type: 'regular'; round: Round; completed: boolean }
  | { type: 'finalJeopardy'; round: FinalJeopardy; completed: boolean }
  | { type: 'none' }

export type GameStatus =
  | 'inactive'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'waiting'
  | 'initializing'
  | 'resetting'
  | 'finalJeopardy'
  | 'error'
  | 'none'

export interface GameState {
  id: string // Unique identifier for the game
  teams: Team[] // Array of teams participating in the game
  rounds: RoundState[] // Array of rounds in the game, each with its own state
  currentTeam?: Team // The currently active team, if any
  currentRound: number // Index of the current round being played
  currentClue?: Clue // The currently selected clue, if any
  status: GameStatus // Current status of the game
  clueSize: number // Size of the clue grid (e.g., 5 for a 5x5 grid)
  categorySize: number // Number of categories in the game
}

export type RoundData = Pick<Round, 'id' | 'categories'>

export interface UpdateCategory {
  id: string // Unique identifier for the category to be updated
  categoryId: string // ID of the category to be updated
  categoryData: Partial<Category> // Partial data to update the category
}

export enum GameStateActionType {
  SET_CATEGORIES = 'SET_CATEGORIES',
  SET_TEAMS = 'SET_TEAMS',
  SET_ROUNDS = 'SET_ROUNDS',
  SET_CURRENT_CLUE = 'SET_CURRENT_CLUE',
  SET_CURRENT_TEAM = 'SET_CURRENT_TEAM',
  SET_CURRENT_ROUND = 'SET_CURRENT_ROUND',
  SET_STATUS = 'SET_STATUS',
  SET_IS_DAILY_DOUBLE = 'SET_IS_DAILY_DOUBLE',
  SET_CLUE_SELECTED = 'SET_CLUE_SELECTED',
  SET_CURRENT_CLUE_ANSWERED = 'SET_CURRENT_CLUE_ANSWERED',
  SET_CURRENT_TEAM_SCORE = 'SET_CURRENT_TEAM_SCORE',
  SET_CURRENT_TEAM_WAGER = 'SET_CURRENT_TEAM_WAGER',
  SET_CURRENT_TEAM_NAME = 'SET_CURRENT_TEAM_NAME',
  INITIALIZE_GAME = 'INITIALIZE_GAME',
  RESET_GAME = 'RESET_GAME',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY',
  UPDATE_TEAM = 'UPDATE_TEAM',
  UPDATE_ROUND = 'UPDATE_ROUND',
  UPDATE_CURRENT_CLUE = 'UPDATE_CURRENT_CLUE',
  UPDATE_CURRENT_TEAM = 'UPDATE_CURRENT_TEAM'
}

export interface GameStatePayload {
  [GameStateActionType.SET_CATEGORIES]: RoundData
  [GameStateActionType.SET_TEAMS]: Team[]
  [GameStateActionType.SET_ROUNDS]: RoundState[]
  [GameStateActionType.SET_CURRENT_CLUE]: Clue | undefined
  [GameStateActionType.SET_CURRENT_TEAM]: Team | undefined
  [GameStateActionType.SET_CURRENT_ROUND]: number
  [GameStateActionType.SET_STATUS]: GameStatus
  [GameStateActionType.SET_IS_DAILY_DOUBLE]: { clueId: string; isDailyDouble: boolean }
  [GameStateActionType.SET_CLUE_SELECTED]: { clueId: string; selected: boolean }
  [GameStateActionType.SET_CURRENT_CLUE_ANSWERED]: { clueId: string; answered: boolean }
  [GameStateActionType.SET_CURRENT_TEAM_SCORE]: { teamId: string; score: number }
  [GameStateActionType.SET_CURRENT_TEAM_WAGER]: { teamId: string; wager: number }
  [GameStateActionType.SET_CURRENT_TEAM_NAME]: { teamId: string; name: string }
  [GameStateActionType.INITIALIZE_GAME]: GameState
  [GameStateActionType.RESET_GAME]: GameState
  [GameStateActionType.UPDATE_CATEGORY]: UpdateCategory
  [GameStateActionType.UPDATE_TEAM]: { teamId: string; teamData: Partial<Team> }
  [GameStateActionType.UPDATE_ROUND]: { roundId: string; roundData: Partial<Round> }
  [GameStateActionType.UPDATE_CURRENT_CLUE]: { clueId: string; clueData: Partial<Clue> }
  [GameStateActionType.UPDATE_CURRENT_TEAM]: { teamId: string; teamData: Partial<Team> }
}

export interface GameStateAction<T extends GameStateActionType> {
  type: T // The action type
  payload: GameStatePayload[T] // The payload for the action, based on the action type
}

export type GameStateReducer = (
  state: GameState,
  action: GameStateAction<GameStateActionType>
) => GameState

export interface GameStateContextType {
  // The currency symbol used in the game
  currency: string
  // The current game state
  gameState: GameState
  // Dispatch function to update the game state
  dispatch: Dispatch<GameStateAction<GameStateActionType>>
  // Function to initialize the game state
  initializeGame: (initialState: GameState) => void
  // Function to reset the game state
  resetGame: () => void
  // Function to pause the game
  pauseGame: () => void
  // Function to resume the game
  resumeGame: () => void
  // Function to stop the game
  stopGame: () => void
  // Function to set the game status
  setGameStatus: (status: GameStatus) => void
  // Function to set the rounds
  setRounds: (rounds: RoundState[]) => void
  // Function to set the teams
  setTeams: (teams: Team[]) => void
  // Function to add a round to the game (e.g., when a new round is created)
  addRound: (round: RoundState) => void
  // Function to set the current team
  setCurrentTeam: (team: Team | undefined) => void
  // Function to set the current round
  setCurrentRound: (roundIndex: number) => void
}
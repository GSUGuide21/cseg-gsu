import type {
  ReactNode,
  HTMLAttributes,
} from "react"

export type RoundType = 
  | "single" 
  | "double" 
  | "final"

export type QuestionType = {
  text: string
  image?: string
  video?: string
  audio?: string
  embed?: string
  embedType?: 'youtube' | 'vimeo' | 'iframe' | 'custom'
}

export interface ClueType {
  id: string
  value: number
  question: QuestionType
  answer: string
  selected?: boolean
  revealed?: boolean
  dailyDouble?: boolean
}

export type ClueWithCategoryId = ClueType & { categoryId?: string }

export type CategoriesProps = HTMLAttributes<HTMLElement>

export interface CategoryType {
  id: string
  title: string
  clues: ClueType[]
}

export interface TeamType {
  id: string
  name: string
  score: number
  avatar?: string
  isActive?: boolean
  isNegative?: boolean
}

export type FinalJeopardyClueType = {
  category: string
  question: string
  answer: string
}

export type Rounds = {
  single: CategoryType[]
  double: CategoryType[]
  final: FinalJeopardyClueType
}

export type GameContextType = {
  round: RoundType
  currency: string
  categories: CategoryType[]
  clueIsOpen: boolean
  teams: TeamType[]
  selectedClue: ClueWithCategoryId | null
  finalClue: FinalJeopardyClueType | null
  finalWagers: Record<string, number>
  // Team management methods
  addTeam: (name: string) => void
  removeTeam: (teamId: string) => void
  updateTeam: (teamId: string, updates: Partial<TeamType>) => void
  resetTeams: () => void
  // Clue selection methods
  pickClue: (categoryId: string, clueId: string, onDailyDouble?: () => void) => void
  closeClue: () => void
  markClueAsRevealed: (categoryId: string, clueId: string) => void
  // Score adjustment methods
  adjustScore: (teamId: string, amount: number) => void
  rewardTeam: (teamId: string, amount: number) => void
  penalizeTeam: (teamId: string, amount: number) => void
  // Round management methods
  startDoubleJeopardy: () => void
  startFinalJeopardy: () => void
  // Final Jeopardy methods
  setFinalWager: (teamId: string, wager: number) => void
  /** Where Final Jeopardy is, and the host's call on each team; saved, so a refresh can't score twice */
  finalPhase: FinalJeopardyPhase
  setFinalPhase: (phase: FinalJeopardyPhase) => void
  finalJudged: Record<string, 'right' | 'wrong'>
  setFinalJudged: (update: (judged: Record<string, 'right' | 'wrong'>) => Record<string, 'right' | 'wrong'>) => void
  /** The most a team can wager on a Daily Double: its score, or the round's top value when that's more */
  dailyDoubleMax: (teamId: string) => number
  // The host menu's fixes
  /** What the last score change was ("+$400 to Team A"), for Undo; null when there's none */
  lastScoreChange: string | null
  setScore: (teamId: string, score: number) => void
  undoScore: () => void
  setClueRevealed: (categoryId: string, clueId: string, revealed: boolean) => void
  goToRound: (round: RoundType) => void
  // Reset game methods
  resetGame: () => void
}

/** One score change, and every team's score from just before it */
export type ScoreChange = { label: string; teams: TeamType[] }

export interface GameProviderProps {
  currency?: string
  children: ReactNode
}

export type BoardContainerProps = HTMLAttributes<HTMLDivElement>
export type BoardProps = HTMLAttributes<HTMLElement>
export type CategoryProps = HTMLAttributes<HTMLElement> & {
  category: CategoryType
  round: RoundType
  onSelectClue?: (clue: ClueType) => void
  /** Its column, for the board's staggered entrance */
  column?: number
}

export type ClueProps = HTMLAttributes<HTMLElement> & {
  clue: ClueType
  categoryId?: string
  disabled?: boolean
  onSelect?: () => void
  /** How long its entrance waits, in seconds (the board fills in tile by tile) */
  delay?: number
}

export type GameControlsProps = HTMLAttributes<HTMLElement>

export type TeamsProps = HTMLAttributes<HTMLElement>

export type TeamProps = HTMLAttributes<HTMLElement> & {
  team: TeamType
  index: number
}

export type FinalJeopardyPhase = 
  | 'category' 
  | 'wagering' 
  | 'question' 
  | 'rewarding' 
  | 'results'

export type FinalJeopardyProps = HTMLAttributes<HTMLElement>

export type FinalJeopardyQuestionProps = HTMLAttributes<HTMLElement> & {
  question: string
}

export interface RawGameState {
  round: RoundType
  categories: CategoryType[]
  teams: TeamType[]
  selectedClue: ClueWithCategoryId | null
  finalClue: FinalJeopardyClueType | null
  finalWagers: Record<string, number>
  finalPhase?: FinalJeopardyPhase
  finalJudged?: Record<string, 'right' | 'wrong'>
}
'use client'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react'

import type {
  GameContextType,
  GameProviderProps,
  CategoryType,
  ClueWithCategoryId,
  FinalJeopardyClueType,
  FinalJeopardyPhase,
  RoundType,
  ScoreChange,
  TeamType,
  Rounds,
  RawGameState
} from './types'

import { useLocalStorage } from '@/hooks/useLocalStorage'

const STORAGE_KEY = 'jeopardy-game-state-v1'

const SAMPLE_ROUNDS: Rounds = {
  single: [
    {
      id: 'lit',
      title: 'Literature',
      clues: [
        {
          id: 'lit-100',
          value: 100,
          question: {
            text: 'Author of \'1984\'',
          },
          answer: 'George Orwell'
        },
        {
          id: 'lit-200',
          value: 200,
          question: {
            text: 'Narrator of \'Moby-Dick\'',
          },
          answer: 'Ishmael'
        },
        {
          id: 'lit-300',
          value: 300,
          question: {
            text: 'Playwright of \'Hamlet\'',
          },
          answer: 'William Shakespeare'
        },
        {
          id: 'lit-400',
          value: 400,
          question: {
            text: 'Poet who wrote \'Because I could not stop for Death\'',
          },
          answer: 'Emily Dickinson'
        },
        {
          id: 'lit-500',
          value: 500,
          question: {
            text: 'Author of \'One Hundred Years of Solitude\'',
          },
          answer: 'Gabriel García Márquez'
        }
      ]
    },
    {
      id: 'sci',
      title: 'Science',
      clues: [
        {
          id: 'sci-100',
          value: 100,
          question: {
            text: 'Planet known as the Red Planet',
          },
          answer: 'Mars'
        },
        {
          id: 'sci-200',
          value: 200,
          question: {
            text: 'Chemical formula for water',
          },
          answer: 'H2O'
        },
        {
          id: 'sci-300',
          value: 300,
          question: {
            text: 'Unit of electric current',
          },
          answer: 'Ampere'
        },
        {
          id: 'sci-400',
          value: 400,
          question: {
            text: 'Study of heredity',
          },
          answer: 'Genetics'
        },
        {
          id: 'sci-500',
          value: 500,
          question: {
            text: 'Theory developed by Einstein (one word)',
          },
          answer: 'Relativity'
        },
      ]
    },
    {
      id: 'hist',
      title: 'History',
      clues: [
        {
          id: 'hist-100',
          value: 100,
          question: {
            text: 'Year the Declaration of Independence was signed',
          },
          answer: '1776'
        },
        {
          id: 'hist-200',
          value: 200,
          question: {
            text: 'First president of the United States',
          },
          answer: 'George Washington'
        },
        {
          id: 'hist-300',
          value: 300,
          question: {
            text: 'Empire that built the Colosseum',
          },
          answer: 'Roman Empire'
        },
        {
          id: 'hist-400',
          value: 400,
          question: {
            text: 'Event in 1066 that changed English history',
          },
          answer: 'Norman Conquest'
        },
        {
          id: 'hist-500',
          value: 500,
          question: {
            text: 'Year the Berlin Wall fell',
          },
          answer: '1989'
        },
      ]
    },
    {
      id: 'sports',
      title: 'Sports',
      clues: [
        {
          id: 'sports-100',
          value: 100,
          question: {
            text: 'Ball used in soccer (UK)',
          },
          answer: 'Football'
        },
        {
          id: 'sports-200',
          value: 200,
          question: {
            text: 'Number of players on a baseball team on field',
          },
          answer: '9'
        },
        {
          id: 'sports-300',
          value: 300,
          question: {
            text: 'Tennis match format with five sets is usually used for which major?',
          },
          answer: 'Wimbledon / Grand Slam mens'
        },
        {
          id: 'sports-400',
          value: 400,
          question: {
            text: 'Country that won the 2018 FIFA World Cup',
          },
          answer: 'France'
        },
        {
          id: 'sports-500',
          value: 500,
          question: {
            text: 'The Olympic Games are held every how many years?',
          },
          answer: '4'
        },
      ]
    },
    {
      id: 'food',
      title: 'Food & Drink',
      clues: [
        {
          id: 'food-100',
          value: 100,
          question: {
            text: 'Main ingredient in guacamole',
          },
          answer: 'Avocado'
        },
        {
          id: 'food-200',
          value: 200,
          question: {
            text: 'Italian dish with layers of pasta, sauce, and cheese',
          },
          answer: 'Lasagna'
        },
        {
          id: 'food-300',
          value: 300,
          question: {
            text: 'Spice derived from dried red berries',
          },
          answer: 'Pepper'
        },
        {
          id: 'food-400',
          value: 400,
          question: {
            text: 'Type of pastry used to make a traditional Greek baklava',
          },
          answer: 'Phyllo',
          dailyDouble: true
        },
        {
          id: 'food-500',
          value: 500,
          question: {
            text: 'Japanese dish consisting of vinegared rice and seafood',
          },
          answer: 'Sushi'
        },
      ]
    },
    {
      id: 'art',
      title: 'Art',
      clues: [
        {
          id: 'art-100',
          value: 100,
          question: {
            text: 'Painter of the \'Mona Lisa\'',
          },
          answer: 'Leonardo da Vinci'
        },
        {
          id: 'art-200',
          value: 200,
          question: {
            text: 'Dutch artist known for \'Starry Night\'',
          },
          answer: 'Vincent van Gogh'
        },
        {
          id: 'art-300',
          value: 300,
          question: {
            text: 'Art movement associated with Salvador Dalí',
          },
          answer: 'Surrealism'
        },
        {
          id: 'art-400',
          value: 400,
          question: {
            text: 'Sculptor of \'David\'',
          },
          answer: 'Michelangelo'
        },
        {
          id: 'art-500',
          value: 500,
          question: {
            text: 'City known for the Louvre Museum',
          },
          answer: 'Paris'
        },
      ]
    }
  ],
  double: [
    {
      id: 'tv-movies',
      title: 'TV & Movies',
      clues: [
        {
          id: 'tv-movies-200',
          value: 200,
          question: { text: 'This TV show features a chemistry teacher who turns to making methamphetamine.' },
          answer: 'Breaking Bad'
        },
        {
          id: 'tv-movies-400',
          value: 400,
          question: { text: 'He directed the epic film "Jurassic Park" released in 1993.' },
          answer: 'Steven Spielberg'
        },
        {
          id: 'tv-movies-600',
          value: 600,
          question: { text: 'This animated sitcom features the characters Homer, Marge, Bart, Lisa, and Maggie.' },
          answer: 'The Simpsons'
        },
        {
          id: 'tv-movies-800',
          value: 800,
          question: { text: 'This 1994 film stars Tim Robbins and Morgan Freeman and is set in a prison.' },
          answer: 'The Shawshank Redemption'
        },
        {
          id: 'tv-movies-1000',
          value: 1000,
          question: { text: 'This actress played Eleven in the Netflix series "Stranger Things".' },
          answer: 'Millie Bobby Brown'
        },
      ]
    },
    {
      id: 'geography',
      title: 'Geography',
      clues: [
        {
          id: 'geography-200',
          value: 200,
          question: { text: 'This is the largest continent by area.' },
          answer: 'Asia'
        },
        {
          id: 'geography-400',
          value: 400,
          question: { text: 'The river that flows through Cairo, Egypt.' },
          answer: 'Nile',
          dailyDouble: true
        },
        {
          id: 'geography-600',
          value: 600,
          question: { text: 'This country is both an island and a continent.' },
          answer: 'Australia'
        },
        {
          id: 'geography-800',
          value: 800,
          question: { text: 'Mount Kilimanjaro is located in this African country.' },
          answer: 'Tanzania'
        },
        {
          id: 'geography-1000',
          value: 1000,
          question: { text: 'This is the smallest country in the world by area.' },
          answer: 'Vatican City'
        },
      ]
    },
    {
      id: 'famous-figures',
      title: 'Famous Figures',
      clues: [
        {
          id: 'famous-figures-200',
          value: 200,
          question: { text: 'He was the first President of the United States.' },
          answer: 'George Washington'
        },
        {
          id: 'famous-figures-400',
          value: 400,
          question: { text: 'This scientist developed the theory of relativity.' },
          answer: 'Albert Einstein'
        },
        {
          id: 'famous-figures-600',
          value: 600,
          question: { text: 'She was the British Prime Minister known as the "Iron Lady".' },
          answer: 'Margaret Thatcher'
        },
        {
          id: 'famous-figures-800',
          value: 800,
          question: { text: 'This South African leader won the Nobel Peace Prize in 1993.' },
          answer: 'Nelson Mandela'
        },
        {
          id: 'famous-figures-1000',
          value: 1000,
          question: { text: 'She was the first woman to win a Nobel Prize and the only person to win in two different sciences.' },
          answer: 'Marie Curie'
        },
      ]
    },
    {
      id: 'technology',
      title: 'Technology',
      clues: [
        {
          id: 'technology-200',
          value: 200,
          question: { text: 'This company created the iPhone.' },
          answer: 'Apple'
        },
        {
          id: 'technology-400',
          value: 400,
          question: { text: 'The main programming language used to build web pages.' },
          answer: 'JavaScript'
        },
        {
          id: 'technology-600',
          value: 600,
          question: { text: 'This is the name of the first electronic general-purpose computer.' },
          answer: 'ENIAC',
          dailyDouble: true
        },
        {
          id: 'technology-800',
          value: 800,
          question: { text: 'This billionaire founded SpaceX and Tesla.' },
          answer: 'Elon Musk'
        },
        {
          id: 'technology-1000',
          value: 1000,
          question: { text: 'This term describes the simulation of human intelligence by machines.' },
          answer: 'Artificial Intelligence (AI)'
        },
      ]
    },
    {
      id: 'languages',
      title: 'Languages',
      clues: [
        {
          id: 'languages-200',
          value: 200,
          question: { text: 'This is the most widely spoken language in the world by native speakers.' },
          answer: 'Mandarin Chinese'
        },
        {
          id: 'languages-400',
          value: 400,
          question: { text: 'The official language of Brazil.' },
          answer: 'Portuguese'
        },
        {
          id: 'languages-600',
          value: 600,
          question: { text: 'This language uses the Cyrillic alphabet and is spoken in Moscow.' },
          answer: 'Russian'
        },
        {
          id: 'languages-800',
          value: 800,
          question: { text: 'This ancient language is the root of many scientific and medical terms.' },
          answer: 'Latin'
        },
        {
          id: 'languages-1000',
          value: 1000,
          question: { text: 'This language is written from right to left and is the official language of Israel.' },
          answer: 'Hebrew'
        },
      ]
    },
    {
      id: 'statistics',
      title: 'Statistics',
      clues: [
        {
          id: 'statistics-200',
          value: 200,
          question: { text: 'This is the average of a set of numbers.' },
          answer: 'Mean'
        },
        {
          id: 'statistics-400',
          value: 400,
          question: { text: 'The value that appears most frequently in a data set.' },
          answer: 'Mode'
        },
        {
          id: 'statistics-600',
          value: 600,
          question: { text: 'This measure of spread is the difference between the highest and lowest values.' },
          answer: 'Range'
        },
        {
          id: 'statistics-800',
          value: 800,
          question: { text: 'This type of graph uses bars to show the frequency of data.' },
          answer: 'Bar chart (or bar graph)'
        },
        {
          id: 'statistics-1000',
          value: 1000,
          question: { text: 'This term describes the likelihood of an event occurring, expressed as a number between 0 and 1.' },
          answer: 'Probability'
        },
      ]
    }
  ],
  final: {
    category: 'U.S. Presidents',
    question: 'This president served the shortest term in U.S. history, dying 31 days after taking office in 1841.',
    answer: 'William Henry Harrison'
  }
}

export const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) throw new Error("useGame must be used within a GameProvider")
  return context
}

export const GameProvider = ({ children, currency = "$" }: GameProviderProps) => {
  // Game state
  const [round, setRound] = useState<RoundType>("single")
  const [isInitialized, setIsInitialized] = useState(false)
  const [categories, setCategories] = useState<CategoryType[]>([...SAMPLE_ROUNDS.single])

  // Team state
  const [teams, setTeams] = useState<TeamType[]>([])

  // Selected clue state. A Daily Double's clue waits for its intro (`opening`); the board
  // is closed to other picks from the moment it's picked
  const [selectedClue, setSelectedClue] = useState<ClueWithCategoryId | null>(null)
  const [opening, setOpening] = useState(false)
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Worked out, not kept, so a clue that's open after a refresh still has its keys
  const clueIsOpen = opening || selectedClue !== null

  // Final Jeopardy state
  const [finalClue, setFinalClue] = useState<FinalJeopardyClueType | null>(null)
  const [finalWagers, setFinalWagers] = useState<Record<string, number>>({})
  const [finalPhase, setFinalPhase] = useState<FinalJeopardyPhase>('category')
  const [finalJudged, setFinalJudgedState] = useState<Record<string, 'right' | 'wrong'>>({})
  const setFinalJudged = useCallback((update: (judged: Record<string, 'right' | 'wrong'>) => Record<string, 'right' | 'wrong'>) => setFinalJudgedState(update), [])

  useEffect(() => () => {
    if (openingTimer.current) clearTimeout(openingTimer.current)
  }, [])

  // The game in progress, kept in localStorage so a refresh doesn't lose it
  const [storedState, setStoredState] = useLocalStorage<RawGameState | null>(STORAGE_KEY, null)

  // On mount, pick up a saved game if there is one (the game page renders in the browser
  // only, so what's saved is there from the first render)
  useEffect(() => {
    if (isInitialized) return
    const parsed = storedState && typeof storedState === "object" ? storedState : null
    if (parsed) {
      if (parsed.round) setRound(parsed.round)
      if (parsed.categories) setCategories(parsed.categories)
      if (parsed.teams) setTeams(parsed.teams)
      if (parsed.selectedClue) setSelectedClue(parsed.selectedClue)
      if (parsed.finalClue) setFinalClue(parsed.finalClue)
      if (parsed.finalWagers) setFinalWagers(parsed.finalWagers)
      if (parsed.finalPhase) setFinalPhase(parsed.finalPhase)
      if (parsed.finalJudged) setFinalJudgedState(parsed.finalJudged)
    }
    setIsInitialized(true)
  }, [storedState, isInitialized])

  // On change, save the game; not before a saved one has loaded, or it would be overwritten
  useEffect(() => {
    if (!isInitialized) return
    const payload: RawGameState = {
      round,
      categories,
      teams,
      selectedClue,
      finalClue,
      finalWagers,
      finalPhase,
      finalJudged,
    }

    setStoredState(payload)
    // setStoredState changes with what's saved; saving shouldn't set off another save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, round, categories, teams, selectedClue, finalClue, finalWagers, finalPhase, finalJudged])

  // Add team
  const addTeam = useCallback((name: string) => {
    const id = `team-${Date.now()}`
    const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)` // random color
    setTeams((prev) => [...prev, { id, name, score: 0, color }])
  }, [])

  // Remove team
  const removeTeam = useCallback((teamId: string) => setTeams(prev => prev.filter(team => team.id !== teamId)), [])

  // Update team
  const updateTeam = useCallback((teamId: string, updates: Partial<TeamType>) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, ...updates } : team
    ))
  }, [])

  // Reset teams
  const resetTeams = useCallback(() => setTeams([]), [])

  // Find current clue
  const findClue = useCallback((categoryId: string, clueId: string) => {
    return categories.find(cat => cat.id === categoryId)?.clues.find(c => c.id === clueId)
  }, [categories])

  // Mark clue as revealed
  const markClueAsRevealed = useCallback((categoryId: string, clueId: string) => {
    const clue = findClue(categoryId, clueId)
    if (!clue) return
    
    const updatedClue = { ...clue, revealed: true }

    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId ?
          { ...cat, clues: cat.clues.map(c => c.id === clueId ? updatedClue : c) }
          : cat
      ))
  }, [findClue])

  // Pick clue. Its tile empties once it's scored (or nobody got it); closing it with Esc
  // puts it back, Daily Double or not
  const pickClue = useCallback((categoryId: string, clueId: string, onDailyDouble?: () => void) => {
    if (clueIsOpen) return // a clue is open, or a Daily Double is on its way

    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return

    const clue = category.clues.find((c) => c.id === clueId && !c.revealed)
    if (!clue) return

    if (!clue.dailyDouble) return setSelectedClue({ ...clue, categoryId })

    // The Daily Double's announcement first (the board's transition), then its clue
    onDailyDouble?.()
    setOpening(true)
    openingTimer.current = setTimeout(() => {
      openingTimer.current = null
      setOpening(false)
      setSelectedClue({ ...clue, categoryId })
    }, 3000)
  }, [categories, clueIsOpen])

  // Close clue
  const closeClue = useCallback(() => setSelectedClue(null), [])

  const dailyDoubleMax = useCallback((teamId: string) => {
    const score = teams.find((t) => t.id === teamId)?.score ?? 0
    const top = Math.max(0, ...categories.flatMap((c) => c.clues.map((clue) => clue.value)))
    return Math.max(score, top)
  }, [teams, categories])

  // Every score change, newest last, with the scores from before it, so the host can take
  // back a misclick. Kept for this sitting only; the last 50 are plenty
  const [scoreHistory, setScoreHistory] = useState<ScoreChange[]>([])
  const teamsRef = useRef(teams)
  teamsRef.current = teams
  const recordScores = useCallback((label: string) => setScoreHistory(prev => [...prev.slice(-49), { label, teams: teamsRef.current }]), [])

  // Adjust score
  const adjustScore = useCallback((teamId: string, amount: number) => {
    const team = teamsRef.current.find(t => t.id === teamId)
    if (!team || !amount) return
    recordScores(`${amount > 0 ? '+' : '−'}${currency}${Math.abs(amount).toLocaleString()} ${amount > 0 ? 'to' : 'from'} ${team.name}`)
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, score: t.score + amount } : t))
  }, [currency, recordScores])

  // Set a team's score outright (the host menu's fix)
  const setScore = useCallback((teamId: string, score: number) => {
    const team = teamsRef.current.find(t => t.id === teamId)
    if (!team || team.score === score || !Number.isFinite(score)) return
    recordScores(`${team.name} set to ${score < 0 ? '−' : ''}${currency}${Math.abs(score).toLocaleString()}`)
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, score } : t))
  }, [currency, recordScores])

  // Undo the last score change: every score back as it was (a team added since keeps its place)
  const undoScore = useCallback(() => {
    const last = scoreHistory.at(-1)
    if (!last) return
    setScoreHistory(prev => prev.slice(0, -1))
    const before = new Map(last.teams.map(t => [t.id, t.score]))
    setTeams(prev => prev.map(t => before.has(t.id) ? { ...t, score: before.get(t.id)! } : t))
  }, [scoreHistory])

  // Played or not, by hand: puts back a clue opened by mistake, or empties a skipped one
  const setClueRevealed = useCallback((categoryId: string, clueId: string, revealed: boolean) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, clues: cat.clues.map(c => c.id === clueId ? { ...c, revealed } : c) } : cat
    ))
  }, [])

  // Jump to a round, its board fresh; the teams and their scores stay
  const goToRound = useCallback((next: RoundType) => {
    if (openingTimer.current) clearTimeout(openingTimer.current)
    openingTimer.current = null
    setOpening(false)
    setSelectedClue(null)
    setRound(next)
    if (next === 'final') {
      setFinalClue(SAMPLE_ROUNDS.final)
      setFinalPhase('category')
      setFinalJudgedState({})
      setFinalWagers(Object.fromEntries(teamsRef.current.map(t => [t.id, 0])))
      return
    }
    setCategories([...SAMPLE_ROUNDS[next]])
  }, [])

  // Reward team
  const rewardTeam = useCallback((teamId: string, amount: number) => adjustScore(teamId, amount), [adjustScore])

  // Penalize team
  const penalizeTeam = useCallback((teamId: string, amount: number) => adjustScore(teamId, -amount), [adjustScore])

  // Start double jeopardy
  const startDoubleJeopardy = useCallback(() => {
    if (round !== "single" || teams.length === 0) return
    console.log("Starting Double Jeopardy")
    setRound("double")
    setCategories([...SAMPLE_ROUNDS.double])
    setSelectedClue(null)
  }, [round, teams])

  // Start final jeopardy
  const startFinalJeopardy = useCallback(() => {
    if (round !== "double" || teams.length === 0) return
    setRound("final")
    setFinalClue(SAMPLE_ROUNDS.final)
    setSelectedClue(null)
    setFinalPhase('category')
    setFinalJudgedState({})

    const emptyWagers: Record<string, number> = teams.reduce((acc, team) => {
      acc[team.id] = 0
      return acc
    }, {} as Record<string, number>)

    setFinalWagers(emptyWagers)
  }, [round, teams, setFinalClue, setSelectedClue, setFinalWagers])
  
  // Set final wager
  const setFinalWager = useCallback((teamId: string, wager: number) => setFinalWagers(prev => ({ ...prev, [teamId]: wager })), [])

  // Reset game
  const resetGame = useCallback(() => {
    if (openingTimer.current) clearTimeout(openingTimer.current)
    openingTimer.current = null
    setOpening(false)
    setRound("single")
    setCategories([...SAMPLE_ROUNDS.single])
    setTeams([])
    setSelectedClue(null)
    setFinalClue(null)
    setFinalWagers({})
    setFinalPhase('category')
    setFinalJudgedState({})
    setScoreHistory([])
    setStoredState(null)
  }, [setStoredState])

  const value = useMemo(() => ({
    round,
    currency,
    categories,
    teams,
    selectedClue,
    clueIsOpen,
    finalClue,
    finalWagers,
    addTeam,
    removeTeam,
    updateTeam,
    resetTeams,
    pickClue,
    closeClue,
    adjustScore,
    rewardTeam,
    penalizeTeam,
    markClueAsRevealed,
    startDoubleJeopardy,
    startFinalJeopardy,
    setFinalWager,
    finalPhase,
    setFinalPhase,
    finalJudged,
    setFinalJudged,
    dailyDoubleMax,
    lastScoreChange: scoreHistory.at(-1)?.label ?? null,
    setScore,
    undoScore,
    setClueRevealed,
    goToRound,
    resetGame
  }), [round, currency, categories, teams, selectedClue, clueIsOpen, finalClue, finalWagers, addTeam, removeTeam, updateTeam, resetTeams, pickClue, closeClue, adjustScore, rewardTeam, penalizeTeam, markClueAsRevealed, startDoubleJeopardy, startFinalJeopardy, setFinalWager, finalPhase, finalJudged, setFinalJudged, dailyDoubleMax, scoreHistory, setScore, undoScore, setClueRevealed, goToRound, resetGame])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
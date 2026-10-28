import { 
  NextRequest, 
  NextResponse 
} from 'next/server'
import { connect } from '@/app-old/lib/mongodb'
import { 
  CATEGORY_SIZE,
  CLUE_SIZE,
  BASE_CLUE_VALUE
} from '@/app-old/lib/constants'
import { 
  uniqueId, 
  clamp 
} from '@/app-old/lib/util'

interface Clue {
  response: string
  answer: string
}

interface Category {
  title: string
  clues: Clue[]
}

type NormalRound = {
  type: 'normal' | 'regular'
  baseValue?: number
  categories: Category[]
}

type FinalJeopardy = {
  type: 'final' | 'finalJeopardy'
  response: string
  answer: string
}

type Round = NormalRound | FinalJeopardy

const validate = (round: Round): boolean => {
  switch (round.type) {
    case 'normal':
    case 'regular':
      return Array.isArray(round.categories) && round.categories.every(category => {
        const { title, clues } = category
        if (!title) return false
        if (!Array.isArray(clues) || clues.length === 0) return false

        return clues.every(clue => {
          const { response, answer } = clue
          return typeof response === 'string' && response.trim() !== '' &&
            typeof answer === 'string' && answer.trim() !== ''
        })
      })
    case 'final':
    case 'finalJeopardy':
      const { response, answer } = round
      return typeof response === 'string' && response.trim() !== '' &&
              typeof answer === 'string' && answer.trim() !== ''
    default:
      return false
  }
}

type CategoryWithId = Category & { id: string }
type RoundWithId = NormalRound & { id: string, categories: (Category | CategoryWithId)[] } | FinalJeopardy & { id: string }

interface PopulateRoundOptions {
  clueSize?: number
  categorySize?: number
  baseValue?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow additional options
}

const generateEmptyClues = (clues: Clue[], options: PopulateRoundOptions): Clue[] => {
  const { clueSize = CLUE_SIZE.DEFAULT } = options
  const delta = clueSize - clues.length
  if (delta <= 0) return []
  if (delta > clueSize) throw new Error(`Cannot generate more than ${clueSize} empty clues`)
  
  return Array.from({ length: delta }, (_, index) => ({
    response: `Response ${index + 1}`,
    answer: `Answer ${index + 1}`
  }))
}

const generateEmptyCategories = (categories: Category[], options: PopulateRoundOptions): Category[] => {
  const { categorySize = CATEGORY_SIZE.DEFAULT } = options
  const delta = categorySize - categories.length
  if (delta <= 0) return []
  if (delta > categorySize) throw new Error(`Cannot generate more than ${categorySize} empty categories`)

  return Array.from({ length: delta }, (_, index) => ({
    title: `Category ${index + 1}`,
    clues: generateEmptyClues([], options)
  }))
}

const populateCategories = (categories: Category[], options: PopulateRoundOptions): CategoryWithId[] => {
  const { 
    categorySize = CATEGORY_SIZE.DEFAULT, 
    clueSize = CLUE_SIZE.DEFAULT, 
    baseValue = BASE_CLUE_VALUE.DEFAULT
  } = options

  const emptyCategories = generateEmptyCategories(categories, options)
  const populateCategories = [...categories, ...emptyCategories].slice(0, categorySize).map((category, index) => {
    const { title, clues } = category
    const emptyClues = generateEmptyClues(clues, options)
    const populatedClues = [...clues, ...emptyClues].slice(0, clueSize).map((clue, clueIndex) => ({
      ...clue,
      id: uniqueId(`clue-${index}-${clueIndex}-`),
      value: baseValue * (clueIndex + 1) // Assuming value is based on clue index
    }))

    return {
      ...category,
      id: uniqueId(`category-${index}-`),
      title: title.trim(),
      clues: populatedClues
    }
  })
  return populateCategories
}

const populateRound = (round: Round, options: PopulateRoundOptions): RoundWithId => {
  if (!validate(round)) throw new Error('Invalid round structure')
  
  switch (round.type) {
    case 'normal':
    case 'regular':
      const { baseValue = BASE_CLUE_VALUE.DEFAULT } = round
      let finalBaseValue = clamp(baseValue, BASE_CLUE_VALUE.MIN, BASE_CLUE_VALUE.MAX)

      if (typeof finalBaseValue !== 'number' || isNaN(finalBaseValue))
        finalBaseValue = BASE_CLUE_VALUE.DEFAULT

      if (finalBaseValue % 100 !== 0) {
        // Round to the nearest hundred
        finalBaseValue = Math.round(finalBaseValue / 100) * 100 // Ensure base value is a multiple of 100
        finalBaseValue = clamp(finalBaseValue, BASE_CLUE_VALUE.MIN, BASE_CLUE_VALUE.MAX)
      }

      return {
        ...round,
        id: uniqueId('round-'),
        categories: populateCategories(round.categories, { ...options, baseValue: finalBaseValue })
      }
    case 'final':
    case 'finalJeopardy':
      return {
        ...round,
        response: round.response.trim(),
        answer: round.answer.trim(),
        id: uniqueId('final-jeopardy-')
      }
    default:
      throw new Error('Invalid round type')
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { 
      title, 
      tags = [],
      description = '',
      rounds = [],
      clueSize = CLUE_SIZE.DEFAULT,
      categorySize = CATEGORY_SIZE.DEFAULT
    } = body

    if (!title) 
      return NextResponse.json({ error: 'A title is required to create a game.' }, { status: 400 })

    if (!rounds || !Array.isArray(rounds) || rounds.length === 0)
      return NextResponse.json({ error: 'At least one round is required to create a game.' }, { status: 400 })

    const finalClueSize = clamp(clueSize, CLUE_SIZE.MIN, CLUE_SIZE.MAX)
    const finalCategorySize = clamp(categorySize, CATEGORY_SIZE.MIN, CATEGORY_SIZE.MAX)

    const isValid = rounds.every(validate)
    if (!isValid) return NextResponse.json({ error: 'Invalid round structure.' }, { status: 400 })

    const client = await connect()
    const db = client.db('jeopardy')
    const collection = db.collection('games')

    const id = uniqueId('game-')
    const populatedRounds = rounds.map(round => populateRound(round, {
      clueSize: finalClueSize,
      categorySize: finalCategorySize
    })) as RoundWithId[]

    const gameTags = Array.isArray(tags) ? 
      tags.map(tag => tag.trim())
        .filter(tag => tag !== '') : [] 

    const gameData = {
      id,
      title: title.trim(),
      description: description.trim(),
      tags: gameTags,
      rounds: populatedRounds
    }

    const result = await collection.insertOne(gameData)
    if (!result.acknowledged) return NextResponse.json({ error: 'Failed to create game.' }, { status: 500 })
    return NextResponse.json({
      message: 'Game created successfully.',
      game: {
        ...gameData,
        _id: result.insertedId.toString() // Convert ObjectId to string
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'An error occurred while creating the game.' }, { status: 500 })
  }
}
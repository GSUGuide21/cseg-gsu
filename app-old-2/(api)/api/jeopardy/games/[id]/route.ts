import {
  NextRequest,
  NextResponse
} from 'next/server'
import { connect } from '@/app-old-2/lib/mongodb'

type GameParams = {
  id: string
}

export const GET = async (req: NextRequest, { params }: { params: GameParams }) => {
  const { id } = params
  const client = await connect()
  const db = client.db('jeopardy')
  const collection = db.collection('games')
  const gameId = `game-${id}`
  const game = await collection.findOne({ id: gameId })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  return NextResponse.json(game, { status: 200 })
}

export const PATCH = async (req: NextRequest, { params }: { params: GameParams }) => {
  const { id } = params
  const client = await connect()
  const db = client.db('jeopardy')
  const collection = db.collection('games')
  const gameId = `game-${id}`
  const updateData = await req.json()
  const result = await collection.updateOne(
    { id: gameId },
    { $set: updateData }
  )
  if (result.matchedCount === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (result.modifiedCount === 0) return NextResponse.json({ error: 'No changes made' }, { status: 400 })
  const updatedGame = await collection.findOne({ id: gameId })
  return NextResponse.json(updatedGame, { status: 200 })
}

export const DELETE = async (req: NextRequest, { params }: { params: GameParams }) => {
  const { id } = params
  const client = await connect()
  const db = client.db('jeopardy')
  const collection = db.collection('games')
  const gameId = `game-${id}`
  const result = await collection.deleteOne({ id: gameId })
  
  if (result.deletedCount === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  return NextResponse.json({ message: 'Game deleted successfully' }, { status: 200 })
}
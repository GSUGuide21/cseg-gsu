import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const POST = async (req: Request) => {
  const url = new URL(req.url)
  const gameId = url.searchParams.get('gameId')
  const categoryId = url.searchParams.get('categoryId')

  if (!gameId || !categoryId) {
    return NextResponse.json({ error: 'Game ID and Category ID are required' }, { status: 400 })
  }

  // Simulate adding a category to a game
  const response = {
    message: `Category ${categoryId} added to game ${gameId}`,
  }

  return NextResponse.json(response)
}
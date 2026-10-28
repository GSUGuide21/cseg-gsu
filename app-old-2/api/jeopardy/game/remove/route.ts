import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const POST = async (req: Request) => {
  const url = new URL(req.url)
  const gameId = url.searchParams.get('gameId')
  const categoryId = url.searchParams.get('categoryId')

  if (!gameId || !categoryId) {
    return NextResponse.json({ error: 'Game ID and Category ID are required' }, { status: 400 })
  }

  // Simulate removing a category from a game
  const response = {
    message: `Category ${categoryId} removed from game ${gameId}`,
  }

  return NextResponse.json(response)
}
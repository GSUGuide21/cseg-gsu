import React from 'react'
import { connect } from '@/app-old/lib/mongodb'

export type JeopardyGamePageProps = {
  params: {
    id: string
  }
}

export default async function JeopardyGamePage({ params }: JeopardyGamePageProps) {
  const gameData = await fetchGameData(params.id)
  return (
    <div className="jeopardy-game">
      <h1>Jeopardy Game</h1>
      <p>Welcome to the Jeopardy game!</p>
      {/* Add your game components here */}
      <p>Game ID: {params.id}</p>
      <p>Game Title: {gameData?.title || 'Loading...'}</p>
      <p>Game Description: {gameData?.description || 'Loading...'}</p>
      {/* You can add more game details or components as needed */}
    </div>
  )
}

const fetchGameData = async (id: string) => {
  try {
    const gameId = `game-${id}`
    const client = await connect()
    const db = client.db('jeopardy')
    const collection = db.collection('games')
    const game = await collection.findOne({ id: gameId })
    if (!game) throw new Error('Game not found')
    return game
  } catch (error) {
    console.error('Error fetching game data:', error)
    // Simulate fetching game data
    return {
      id,
      title: `Jeopardy Game ${id}`,
      description: 'This is a sample Jeopardy game.'
    }
  }
}
/* 
export async function getServerSideProps({ params }: JeopardyGamePageProps) {
  // Fetch game data based on params.id if needed
  const gameData = await fetchGameData(params.id)

  return {
    props: {
      gameData,
      params
    }
  }
} */
import React from 'react'
import { JeopardyGamePageProps } from '@/app-old-2/(jeopardy)/config'

export default async function JeopardyGamePage({ params }: JeopardyGamePageProps) {
  return (
    <div className="jeopardy-game">
      <h1>Jeopardy Game</h1>
      <p>Welcome to the Jeopardy game!</p>
      {/* Add your game components here */}
      <p>Game ID: {params.id}</p>
      {/* You can add more game details or components as needed */}
    </div>
  )
}
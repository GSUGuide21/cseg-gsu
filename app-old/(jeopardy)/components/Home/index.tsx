'use client'
import React from 'react'
import clsx from 'clsx'
import { Header } from './Header'
import './index.scss'
import { Document, WithId } from 'mongodb'

export type GameData = Omit<WithId<Document>, '_id'> & { _id: string }

export type HomePageProps = React.HTMLAttributes<HTMLDivElement> & {
  data?: GameData[]
}

export const HomePage: React.FC<HomePageProps> = ({
  className,
  data = [],
  ...props
}) => {
  return (
    <div
      {...props}
      className={clsx('jeopardy-home', className)}>
      <Header className="jeopardy-home__header" />
      {/* <GameList /> */}
      <h1>Welcome to Jeopardy!</h1>
      <p>Click below to start playing.</p>
      <button className="start-game-button">Start Game</button>
      <div className="jeopardy-home__games">
        {data.length > 0 ? (
          data.map((game) => (
            <div key={game._id} className="jeopardy-home__game">
              <h2>{game.title}</h2>
              <p>{game.description}</p>
            </div>
          ))
        ) : (
          <p>No games available.</p>
        )}
        </div>
    </div>
  )
}
'use client'
import React from 'react'
import clsx from 'clsx'
import { 
  type GameState,
  GameStateProvider 
} from './Context'
import { Board } from './Board'

export const initialGameState: Partial<GameState> = {
  clueSize: 5,
  categorySize: 6,
  rounds: [
    {
      isFinalJeopardy: false,
      title: "Jeopardy",
      data: {
        baseValue: 200,
        categories: [
          {
            title: "Science",
            clues: [
              {
                question: "What is the chemical symbol for gold?",
                answer: "Au",
              },
              {
                question: "What is the chemical symbol for silver?",
                answer: "Ag",
              },
              {
                question: "What is the chemical symbol for iron?",
                answer: "Fe",
              },
              {
                question: "What is the chemical symbol for oxygen?",
                answer: "O",
              },
              {
                question: "What is the chemical symbol for hydrogen?",
                answer: "H",
              },
            ],
          },
          {
            title: "Video Games",
            clues: [
              {
                question: "What is the name of the first video game?",
                answer: "Tennis for Two",
              },
              {
                question: "What is the name of the first home video game console?",
                answer: "Magnavox Odyssey",
              },
              {
                question: "What is the name of the first handheld video game console?",
                answer: "Microvision",
              },
              {
                question: "What is the name of the first arcade video game?",
                answer: "Computer Space",
              },
              {
                question: "What is the name of the first video game to feature a scrolling screen?",
                answer: "Space Invaders",
              },
            ],
          },
          {
            title: "Music",
            clues: [
              {
                question: "What is the name of the lead singer of Queen?",
                answer: "Freddie Mercury",
              },
              {
                question: 'What is the name of the band that released "Bohemian Rhapsody"?',
                answer: "Queen",
              },
              {
                question: "What is the name of the lead singer of U2?",
                answer: "Bono",
              },
              {
                question: 'What is the name of the band that released "Stairway to Heaven"?',
                answer: "Led Zeppelin",
              },
              {
                question: 'What is the name of the band that released "Hotel California"?',
                answer: "Eagles",
              },
            ],
          },
          {
            title: "Sports",
            clues: [
              {
                question: "What is the name of the sport that involves hitting a ball with a racket?",
                answer: "Tennis",
              },
              {
                question: "What is the name of the sport that involves running, jumping, and throwing?",
                answer: "Athletics",
              },
              {
                question: "What is the name of the sport that involves riding a horse?",
                answer: "Equestrian",
              },
              {
                question: "What is the name of the sport that involves swimming, cycling, and running?",
                answer: "Triathlon",
              },
              {
                question: "What is the name of the sport that involves throwing a ball through a hoop?",
                answer: "Basketball",
              },
              {
                question: "What is the name of the sport that involves kicking a ball into a goal?",
                answer: "Soccer",
              },
            ],
          },
          {
            title: "Black History",
            clues: [
              {
                question: "What is the name of the first African American president of the United States?",
                answer: "Barack Obama",
              },
              {
                question: "What is the name of the first African American entrepreneur?",
                answer: "Madam C.J. Walker",
              },
              {
                question: "What is the name of the first African American inventor?",
                answer: "George Washington Carver",
              },
              {
                question: "What is the name of the first African American astronaut?",
                answer: "Guion S. Bluford Jr.",
              },
              {
                question: "What is the name of the first African American Supreme Court Justice?",
                answer: "Thurgood Marshall",
              },
              {
                question: "What is the name of the most famous Civil Rights leader?",
                answer: "Martin Luther King Jr.",
              },
            ],
          },
          {
            title: "Famous Quotes",
            clues: [
              {
                question: 'What is the name of the author who wrote "The Great Gatsby"?',
                answer: "F. Scott Fitzgerald",
              },
              {
                question: 'What is the name of the author who wrote "To Kill a Mockingbird"?',
                answer: "Harper Lee",
              },
              {
                question: 'What is the name of the author who wrote "1984"?',
                answer: "George Orwell",
              },
              {
                question: 'What is the name of the author who wrote "Pride and Prejudice"?',
                answer: "Jane Austen",
              },
              {
                question: 'What is the name of the author who wrote "Moby Dick"?',
                answer: "Herman Melville",
              },
            ],
          },
        ],
      },
    },
  ],
};

export type BoardContainerProps = React.HTMLAttributes<HTMLElement> & {
  /**
   * The initial game state
   * @default initialGameState
   */
  data?: Partial<GameState>
}

export const BoardContainer: React.FC<BoardContainerProps> = ({
  className,
  data = initialGameState,
  ...props
}) => {

  return (
    <GameStateProvider data={data}>
      <div {...props} className={clsx('jeopardy-board', className)}></div>
      <Board />
    </GameStateProvider>
  )
}
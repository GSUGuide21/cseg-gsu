'use client'

// The game's fonts load with the components that use them (see components/fonts.ts)
import { Board } from '../../components'
import { Container } from '../../components/Container'

/** The board, with its teams and saved progress (see GameProvider in Container) */
export default function Game() {
  return (
    <Container>
      <Board />
    </Container>
  )
}

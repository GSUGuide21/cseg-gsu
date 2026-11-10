import Link from 'next/link'

import { StartButtons } from './StartButtons'

/** The game's title screen: how it plays, and into the board */
export default function JeopardyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#071277] px-6 py-16 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <p className="m-0 text-sm font-bold tracking-[0.2em] text-[#d69f4c] uppercase">CSEG presents</p>
        <h1 className="m-0 text-[clamp(3rem,10vw,6rem)] leading-none font-extrabold tracking-tight text-[#d69f4c] [text-shadow:0_4px_0_#000]">Jeopardy!</h1>
        <p className="m-0 max-w-xl text-lg text-white/85">Campus trivia for club meetings and events. Best on a big screen, with a host at the keyboard.</p>
      </div>

      <ol className="m-0 grid max-w-3xl list-none gap-4 p-0 text-left sm:grid-cols-3">
        {[
          ['Add teams', 'Name each team before the first clue. Scores show along the bottom.'],
          ['Pick clues', 'A team picks a category and value; the host reveals the clue and awards the points.'],
          ['Final Jeopardy', 'After Double Jeopardy, teams wager what they’ve won on one last clue.'],
        ].map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-[#d69f4c]/40 bg-black/20 p-4">
            <span className="text-sm font-bold text-[#d69f4c]">{i + 1}</span>
            <h2 className="m-0 mt-1 text-lg font-bold">{title}</h2>
            <p className="m-0 mt-1 text-sm text-white/75">{text}</p>
          </li>
        ))}
      </ol>

      <StartButtons />
      <p className="m-0 text-sm text-white/60">A game in progress is kept on this computer, so a refresh won’t lose it.</p>

      <Link href="/" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
        Back to CSEG
      </Link>
    </main>
  )
}

import React from 'react'
// import { BoardContainer } from '@/app/(jeopardy)/components/Board-old'
import { HomePage } from '@/app-old/(jeopardy)/components/Home'
import { connect } from '@/app-old/lib/mongodb'

export default async function Page() {
  const client = await connect()
  const db = client.db('jeopardy')
  const collection = db.collection('games')
  const games = await collection.find({}).toArray()
  const data = games.map((game) => ({
    ...game,
    _id: game._id.toString(), // Convert ObjectId to string for JSON serialization
  }))

  return (
    <div className="jeopardy-page">
      <HomePage data={data} />
    </div>
  )
}
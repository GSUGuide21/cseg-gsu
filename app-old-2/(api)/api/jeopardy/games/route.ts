import { NextResponse } from "next/server"
import { connect } from "@/app-old-2/lib/mongodb"

export const GET = async () => {
  try {
    const client = await connect()
    const db = client.db("jeopardy")
    const collection = db.collection("games")
    const games = await collection.find({}).toArray()
    return NextResponse.json(games, { status: 200 })
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
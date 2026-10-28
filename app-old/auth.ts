import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { genSalt, hash } from "bcryptjs"
import { connect } from "@/app-old/lib/mongodb"
import { client } from "@/app-old/lib/mongodbSync"
import { MongoDBAdapter } from "@auth/mongodb-adapter"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(client),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials || {}
        if (!username) throw new Error("Username cannot be empty.")
        if (!password) throw new Error("Password cannot be empty.")

        const salt = await genSalt(10)
        const hashedPassword = await hash(password as string, salt)

        const client = await connect()
        const db = client.db("users") // Replace with your database name
        const user = await db.collection("users").findOne({
          username,
          password: hashedPassword,
        })

        if (!user) throw new Error("Invalid username or password.")

        return {
          id: user._id.toString(),
          name: user.name || username,
          email: user.email || null,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  /* pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error"
  } */
})
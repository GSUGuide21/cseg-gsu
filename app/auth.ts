import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { genSalt, hash, compare } from "bcryptjs"
import { client } from "@/app-old/lib/mongodbSync"

export const {
  handlers,
  signIn,
  signOut,
  auth
} = NextAuth({
  adapter: MongoDBAdapter(client),
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const { username, password } = credentials || {}
        if (!username) throw new Error('Username cannot be empty.')
        if (!password) throw new Error('Password cannot be empty.')

        const salt = await genSalt(10)
        const hashed = await hash(password as string, salt)
        const db = client.db('users') // Replace with your database name
        const user = await db.collection('users').findOne({
          username,
          password: hashed
        })

        if (!user) throw new Error('No user found with the provided credentials.')
        
        const isValid = await compare(password as string, user.password)
        if (!isValid) throw new Error('Invalid username or password.')
        
        return {
          id: user._id.toString(),
          name: user.name || username,
          email: user.email || null
        }
      }
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    })
  ],
})
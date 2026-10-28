import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
if (!MONGODB_URI) throw new Error('Please define the MONGODB_URI environment variable')

const MONGODB_OPTIONS: { [key: string]: unknown } = {
  useUnifiedTopology: true
}

let cachedClient: MongoClient | null = null

switch (process.env.NODE_ENV) {
  case 'development':
    const globalWithMongoClient = global as typeof globalThis & {
      _mongoClient: MongoClient | null
    }

    if (!globalWithMongoClient._mongoClient) {
      cachedClient = new MongoClient(MONGODB_URI, MONGODB_OPTIONS)
      globalWithMongoClient._mongoClient = cachedClient
    } else {
      cachedClient = globalWithMongoClient._mongoClient
    }

    break
  case 'production':
    if (!cachedClient) cachedClient = new MongoClient(MONGODB_URI, MONGODB_OPTIONS)
    break
  default:
    throw new Error(`Unsupported NODE_ENV: ${process.env.NODE_ENV}`)
}

export const client = cachedClient
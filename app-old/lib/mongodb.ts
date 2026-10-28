'use server'
import { 
  MongoClient, 
  type Db 
} from 'mongodb'

class MongoDB {
  private static URI = process.env.MONGODB_URI || ''
  private static OPTIONS: { [key: string]: unknown } = {}
  private client: MongoClient | null = null
  private connected: boolean = false

  public constructor() {
    this.client = new MongoClient(MongoDB.URI, MongoDB.OPTIONS)
  }

  public connect = async (): Promise<MongoClient> => {
    if (this.connected) return this.client as MongoClient

    try {
      await this.client?.connect()
      this.connected = true
      return this.client as MongoClient
    } catch (error) {
      console.error('MongoDB connection error:', error)
      throw error
    }
  }

  public disconnect = async (): Promise<void> => {
    if (!this.connected) return

    try {
      await this.client?.close()
      this.connected = false
    } catch (error) {
      console.error('MongoDB disconnection error:', error)
      throw error
    }
  }

  public getClient = (): MongoClient | null => this.client
  public isConnected = (): boolean => this.connected

  public db = (dbName: string): Db | null => {
    if (!this.client) return null
    if (!this.connected) throw new Error('MongoDB client is not connected. Please call connect() first.')
    if (!dbName) throw new Error('Database name is required.')
    return this.client.db(dbName)
  }
}

const mongo = new MongoDB()
export const connect = mongo.connect
export default connect
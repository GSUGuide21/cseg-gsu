declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      NEXT_PUBLIC_SERVER_URL?: string
      NEXT_PUBLIC_CLIENT_URL?: string
      NEXT_PROJECT_PRODUCTION_URL?: string
      NEXT_PUBLIC_API_URL?: string
      NEXT_PUBLIC_API_KEY?: string
      PORT?: string
      MONGODB_URI: string
    }
  }
}

export {}
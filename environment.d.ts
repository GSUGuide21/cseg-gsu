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
      GOOGLE_CLIENT_ID?: string
      GOOGLE_CLIENT_SECRET?: string
      GOOGLE_REDIRECT_URI?: string
      /** The officer dashboard's Supabase project (see app/lib/supabase/env.ts) */
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
      /** The older name for the public key; either works */
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
    }
  }
}

export {}
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      username: string
      isPremium: boolean
      isAnonymous?: boolean
    }
  }

  interface User {
    id: string
    username: string
    email: string
    isPremium: boolean
  }
}

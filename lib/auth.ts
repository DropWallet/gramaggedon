import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './db'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { verifyPassword } from './password'
import { Prisma } from '@prisma/client'

function sanitizeUsername(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)

  return base.length > 0 ? base : `player${Math.floor(Math.random() * 10000)}`
}

async function generateUniqueUsername(base: string): Promise<string> {
  let username = sanitizeUsername(base)
  let counter = 0

  while (true) {
    const exists = await prisma.user.findUnique({ where: { username } })
    if (!exists) return username
    counter += 1
    username = `${sanitizeUsername(base)}${counter}`
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        emailOrUsername: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrUsername || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.emailOrUsername.toLowerCase() },
              { username: credentials.emailOrUsername.toLowerCase() },
            ],
          },
        })

        if (!user) {
          return null
        }

        if (!user.passwordHash) {
          return null
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username || user.email,
          username: user.username || 'user',
          isPremium: user.isPremium,
        } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        if (!user.email) {
          return false
        }

        // Check if a user with this email already exists (from email/password signup)
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          include: { accounts: true },
        })

        if (existingUser) {
          // Check if Google account is already linked
          const existingGoogleAccount = existingUser.accounts.find(
            (acc) => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
          )

          if (!existingGoogleAccount && account) {
            // Link Google account to existing user
            try {
              // Check if account with this providerAccountId already exists (might be orphaned)
              const orphanedAccount = await prisma.account.findUnique({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
              })

              if (orphanedAccount) {
                // Update orphaned account to link to existing user
                await prisma.account.update({
                  where: {
                    provider_providerAccountId: {
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                    },
                  },
                  data: {
                    userId: existingUser.id,
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                  },
                })
              } else {
                // Create new account linked to existing user
                await prisma.account.create({
                  data: {
                    userId: existingUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                  },
                })
              }
              // Update the user ID in the callback to use the existing user
              // This tells the adapter to use the existing user instead of creating a new one
              user.id = existingUser.id
            } catch (error) {
              console.error('Error linking Google account:', error)
              // If linking fails due to unique constraint, account might already be linked
              // Try to find the account and use that user
              const linkedAccount = await prisma.account.findUnique({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
              })
              if (linkedAccount) {
                user.id = linkedAccount.userId
              }
            }
          } else if (existingGoogleAccount) {
            // Google account already linked, use existing user
            user.id = existingUser.id
          }
        }

        // Handle username generation for new or existing users
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (dbUser && !dbUser.username) {
          const profileAny = profile as any
          const base = profileAny?.given_name ?? profile?.name ?? dbUser.email.split('@')[0]
          const username = await generateUniqueUsername(base)
          await prisma.user.update({ where: { id: dbUser.id }, data: { username } })
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('/login') || url.includes('/register')) {
        return baseUrl
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, user }) {
      // On initial sign in, merge user details into the token
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: (user as any).id },
          select: { id: true, username: true, isPremium: true, email: true },
        })
        token.sub = dbUser?.id || (user as any).id || token.sub
        ;(token as any).username = dbUser?.username || (user as any).username || 'user'
        ;(token as any).isPremium = dbUser?.isPremium ?? (user as any).isPremium ?? false
        token.email = dbUser?.email || user.email || token.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) || session.user.id
        session.user.username = ((token as any).username as string) || session.user.username || 'user'
        session.user.isPremium = ((token as any).isPremium as boolean) ?? session.user.isPremium ?? false
        session.user.isAnonymous = false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  events: {
    async createUser({ user }) {
      try {
        if (!user.username && user.email) {
          const base = user.email.split('@')[0]
          const username = await generateUniqueUsername(base)
          await prisma.user.update({ where: { id: user.id }, data: { username } })
          console.log('Generated username for new user:', username)
        }
      } catch (error) {
        console.error('Error generating username in createUser event:', error)
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

export type AuthOptions = typeof authOptions

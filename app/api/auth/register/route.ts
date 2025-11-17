import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { claimAnonymousResults } from '@/lib/claim-results'

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8),
  sessionId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, username, password, sessionId } = registerSchema.parse(body)

    const normalizedEmail = email.toLowerCase()
    const normalizedUsername = username.toLowerCase()

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already in use' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
      },
    })

    if (sessionId) {
      try {
        await claimAnonymousResults(user.id, sessionId)
      } catch (error) {
        console.error('Failed to claim anonymous results:', error)
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    console.error('Registration error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

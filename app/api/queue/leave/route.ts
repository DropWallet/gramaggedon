import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    // Get sessionId from request body (client will pass it)
    const body = await request.json().catch(() => ({}))
    const sessionId = userId ? null : body.sessionId || null

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Must be logged in or have a session' },
        { status: 401 }
      )
    }

    // Find and delete queue entry
    const queueEntry = await prisma.gameQueue.findFirst({
      where: {
        gameId: null, // Only leave queue entries, not active games
        ...(userId ? { userId } : { sessionId }),
      },
    })

    if (!queueEntry) {
      return NextResponse.json(
        { error: 'Not in queue' },
        { status: 404 }
      )
    }

    await prisma.gameQueue.delete({
      where: { id: queueEntry.id },
    })

    return NextResponse.json(
      { message: 'Left queue successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Queue leave error:', error)
    return NextResponse.json(
      { error: 'Failed to leave queue' },
      { status: 500 }
    )
  }
}


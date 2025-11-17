import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextGameTime } from '@/lib/game-schedule'
import { generateSessionId, isValidSessionId } from '@/lib/anonymous'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const nextGameTime = getNextGameTime()
    const now = new Date()

    // Check if game has already started
    if (now >= nextGameTime) {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      )
    }

    // Get request body for sessionId (if anonymous user)
    let body: { sessionId?: string } = {}
    try {
      body = await request.json()
    } catch (e) {
      // Request body might be empty, that's okay
      body = {}
    }
    let sessionId = body.sessionId || null

    // Get user ID or generate session ID
    const userId = session?.user?.id || null
    
    // If no user and no valid sessionId provided, generate one
    if (!userId && (!sessionId || !isValidSessionId(sessionId))) {
      sessionId = generateSessionId()
    } else if (userId) {
      sessionId = null // Don't use sessionId for logged-in users
    }

    // Check if already in queue
    const existingQueue = await prisma.gameQueue.findFirst({
      where: {
        gameId: null, // Queue entries have null gameId until game starts
        leftAt: null, // Not left the queue
        ...(userId ? { userId } : { sessionId }),
      },
    })

    if (existingQueue) {
      return NextResponse.json(
        { message: 'Already in queue', queueId: existingQueue.id },
        { status: 200 }
      )
    }

    // Create queue entry
    // Note: gameId is null for queue entries (default), will be set when game starts
    const queueEntry = await prisma.gameQueue.create({
      data: {
        userId,
        sessionId,
        // gameId is nullable and defaults to null for queue entries
        joinedAt: now,
      },
    })

    console.log('Queue entry created:', { 
      queueId: queueEntry.id, 
      userId, 
      sessionId,
      hasSession: !!session 
    })

    return NextResponse.json(
      {
        message: 'Joined queue successfully',
        queueId: queueEntry.id,
        sessionId: sessionId || undefined, // Return sessionId if generated (for client to store)
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Queue join error:', error)
    return NextResponse.json(
      { error: 'Failed to join queue' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextGameTime } from '@/lib/game-schedule'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    console.log('Queue status check - Session info:', { 
      hasSession: !!session, 
      userId,
      userEmail: session?.user?.email 
    })
    
    // Get sessionId from query params (client will pass it)
    const { searchParams } = new URL(request.url)
    const sessionId = userId ? null : searchParams.get('sessionId')

    const nextGameTime = getNextGameTime()

    // Count total players in queue
    const queueCount = await prisma.gameQueue.count({
      where: {
        gameId: null, // Only count queue entries, not active games
        leftAt: null, // Not left the queue
      },
    })

    // Check if user is in queue
    let isInQueue = false
    if (userId || sessionId) {
      const whereClause: any = {
        gameId: null, // Only queue entries, not active games
        leftAt: null, // Not left the queue
      }
      
      if (userId) {
        whereClause.userId = userId
      } else if (sessionId) {
        whereClause.sessionId = sessionId
      }
      
      const queueEntry = await prisma.gameQueue.findFirst({
        where: whereClause,
      })
      isInQueue = !!queueEntry
      
      // Debug logging
      if (!isInQueue && (userId || sessionId)) {
        console.log('Queue status check - User not found in queue:', { userId, sessionId, whereClause })
      }
    }

    return NextResponse.json({
      isInQueue,
      playersWaiting: queueCount,
      nextGameTime: nextGameTime.toISOString(),
    })
  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}


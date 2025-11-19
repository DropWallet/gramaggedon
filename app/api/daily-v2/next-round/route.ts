export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startNextRoundV2, getDailyGameV2 } from '@/lib/game-engine-v2'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const body = await request.json()
    const { gameId, roundNumber, sessionId } = body
    
    if (!gameId || !roundNumber) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }
    
    await startNextRoundV2({
      gameId,
      roundNumber,
      userId,
      sessionId: userId ? null : sessionId
    })
    
    // Return updated game state
    const result = await getDailyGameV2(userId, userId ? null : sessionId)
    
    return NextResponse.json({
      roundStartTimes: result.roundStartTimes,
      solvedWords: result.solvedWords || {}
    })
  } catch (error) {
    console.error('Error in /api/daily-v2/next-round:', error)
    return NextResponse.json(
      { error: 'Failed to start next round', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


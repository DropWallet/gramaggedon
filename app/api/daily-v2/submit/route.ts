export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitAnswerV2 } from '@/lib/game-engine-v2'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const body = await request.json()
    const { gameId, roundNumber, wordIndex, answer, sessionId } = body
    
    if (!gameId || !roundNumber || wordIndex === undefined || !answer) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }
    
    const result = await submitAnswerV2({
      gameId,
      roundNumber,
      wordIndex,
      guess: answer,
      userId,
      sessionId: userId ? null : sessionId
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in /api/daily-v2/submit:', error)
    return NextResponse.json(
      { error: 'Failed to submit answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


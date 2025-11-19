export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markGameFailedV2 } from '@/lib/game-engine-v2'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const body = await request.json()
    const { gameId, sessionId } = body
    
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }
    
    await markGameFailedV2({
      gameId,
      userId,
      sessionId: userId ? null : sessionId
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in /api/daily-v2/mark-failed:', error)
    return NextResponse.json(
      { error: 'Failed to mark game as failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


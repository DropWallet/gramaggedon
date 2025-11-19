import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDailyGameV2 } from '@/lib/game-engine-v2'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { sessionId?: string }
    const sessionId = body.sessionId || null

    if (!sessionId) {
      // No sessionId to claim, that's okay
      return NextResponse.json({ claimed: false })
    }

    // Call getDailyGameV2 which will automatically claim if anonymous game exists
    // This is idempotent - safe to call multiple times
    try {
      await getDailyGameV2(userId, sessionId)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Claim] Game claimed successfully')
      }
      return NextResponse.json({ claimed: true })
    } catch (error) {
      // If no game exists to claim, that's fine
      if (process.env.NODE_ENV === 'development') {
        console.log('[Claim] No anonymous game to claim:', error)
      }
      return NextResponse.json({ claimed: false })
    }
  } catch (error) {
    console.error('Error claiming games:', error)
    // Don't fail the request - claiming is best-effort
    return NextResponse.json({ claimed: false, error: 'Failed to claim' })
  }
}


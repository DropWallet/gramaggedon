export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureDailyGameForPlayer } from '@/lib/game-engine'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    let sessionId: string | null = null
    try {
      const body = await request.json().catch(() => ({})) as any
      sessionId = body?.sessionId ?? null
    } catch {}

    const { game, result } = await ensureDailyGameForPlayer(userId, sessionId)

    return NextResponse.json({
      id: result.id,
      roundsCompleted: result.roundsCompleted,
      completedAt: result.completedAt,
      game: {
        id: game.id,
        status: game.status,
        currentRound: game.currentRound,
        maxRounds: game.maxRounds,
        roundTimeSeconds: game.roundTimeSeconds,
        rounds: game.rounds.map(r => ({
          id: r.id,
          roundNumber: r.roundNumber,
          timeSeconds: r.timeSeconds,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
          words: r.words
            .sort((a,b) => a.index - b.index)
            .map(w => ({ id: w.id, index: w.index, anagram: w.anagram, solvedAt: w.solvedAt, attempts: w.attempts, solution: w.solution })),
        })),
      },
    })
  } catch (error) {
    console.error('Error in /api/daily/start:', error)
    return NextResponse.json(
      { error: 'Failed to start daily game', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

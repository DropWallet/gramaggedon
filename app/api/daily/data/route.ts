export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveDailyGame } from '@/lib/game-engine'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null

  const url = new URL(request.url)
  const sessionId = userId ? null : (url.searchParams.get('sessionId') || null)

  const result = await getActiveDailyGame(userId, sessionId)
  if (!result) return NextResponse.json({ error: 'No daily game' }, { status: 404 })

  return NextResponse.json({
    id: result.id,
    roundsCompleted: result.roundsCompleted,
    completedAt: result.completedAt,
    game: {
      id: result.game.id,
      status: result.game.status,
      currentRound: result.game.currentRound,
      maxRounds: result.game.maxRounds,
      roundTimeSeconds: result.game.roundTimeSeconds,
      rounds: result.game.rounds.map(r => ({
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
}

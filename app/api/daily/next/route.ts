export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { startCurrentRoundNow } from '@/lib/game-engine'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as any
    const { gameId } = body
    if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    
    // Start the next round
    const res = await startCurrentRoundNow(gameId)
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to start next round' }, { status: 500 })
    }
    
    // Fetch and return the updated game data
    const gameResult = await prisma.gameResult.findFirst({
      where: { gameId },
      include: {
        game: {
          include: {
            rounds: {
              include: { words: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        }
      }
    })
    
    if (!gameResult) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      id: gameResult.id,
      roundsCompleted: gameResult.roundsCompleted,
      completedAt: gameResult.completedAt,
      game: {
        id: gameResult.game.id,
        status: gameResult.game.status,
        currentRound: gameResult.game.currentRound,
        maxRounds: gameResult.game.maxRounds,
        roundTimeSeconds: gameResult.game.roundTimeSeconds,
        rounds: gameResult.game.rounds.map(r => ({
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
    console.error('Error in /api/daily/next:', error)
    return NextResponse.json(
      { error: 'Failed to start next round', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getCurrentGame } from '@/lib/game-engine'
import { processRoundEnd } from '@/lib/round-progression'

/**
 * Test endpoint to manually advance to the next round
 * Only available in development mode or with TEST_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check if we're in development or have test secret
    const isDevelopment = process.env.NODE_ENV === 'development'
    const testSecret = process.env.TEST_SECRET
    const authHeader = request.headers.get('authorization')

    if (!isDevelopment && testSecret) {
      if (authHeader !== `Bearer ${testSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized - Test endpoints require TEST_SECRET in production' },
          { status: 401 }
        )
      }
    }

    // Get current active game
    const currentGame = await getCurrentGame()

    if (!currentGame) {
      return NextResponse.json(
        { error: 'No active game found' },
        { status: 404 }
      )
    }

    // Process the end of the current round
    const result = await processRoundEnd(currentGame.id)

    return NextResponse.json({
      message: 'Round advanced successfully',
      gameId: currentGame.id,
      previousRound: currentGame.currentRound - 1,
      currentRound: result.nextRound || 'Game ended',
      eliminatedCount: result.eliminatedCount,
      remainingPlayers: result.remainingPlayers,
      winner: result.winner,
      gameStatus: result.nextRound ? 'IN_PROGRESS' : 'COMPLETED',
    })
  } catch (error) {
    console.error('Error in test advance round endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to advance round', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


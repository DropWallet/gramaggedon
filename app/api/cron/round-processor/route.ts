import { NextResponse } from 'next/server'
import { getCurrentGame } from '@/lib/game-engine'
import { checkRoundEnd, processRoundEnd } from '@/lib/round-progression'

/**
 * Cron endpoint to automatically process round endings
 * This should be called every 5-10 seconds to check if rounds have ended
 * 
 * In production, set up a Vercel Cron job or similar
 * In development, you can call this manually or set up a simple interval
 */
export async function GET(request: Request) {
  try {
    // Optional: Add auth check for cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current active game
    const currentGame = await getCurrentGame()

    if (!currentGame) {
      return NextResponse.json({
        message: 'No active game',
        processed: false,
      })
    }

    // Check if current round has ended
    const roundEnded = await checkRoundEnd(currentGame.id)

    if (roundEnded) {
      // Process the round end (eliminations, advance to next round, etc.)
      const result = await processRoundEnd(currentGame.id)

      return NextResponse.json({
        message: 'Round processed',
        processed: true,
        gameId: currentGame.id,
        previousRound: currentGame.currentRound,
        nextRound: result.nextRound,
        eliminatedCount: result.eliminatedCount,
        remainingPlayers: result.remainingPlayers,
        winner: result.winner,
        gameStatus: result.nextRound ? 'IN_PROGRESS' : 'COMPLETED',
      })
    }

    return NextResponse.json({
      message: 'Round still in progress',
      processed: false,
      gameId: currentGame.id,
      currentRound: currentGame.currentRound,
    })
  } catch (error) {
    console.error('Error in round processor:', error)
    return NextResponse.json(
      { error: 'Failed to process round', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for manual triggering (testing)
 */
export async function POST(request: Request) {
  return GET(request)
}


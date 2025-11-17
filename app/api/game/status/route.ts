import { NextResponse } from 'next/server'
import { getCurrentGame, getActiveGameForPlayer } from '@/lib/game-engine'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET endpoint to check game status
 * Returns current active game information
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    // Get sessionId from query params (for anonymous users)
    const { searchParams } = new URL(request.url)
    const sessionId = userId ? null : searchParams.get('sessionId')

    // Get current active game
    const currentGame = await getCurrentGame()

    if (!currentGame) {
      return NextResponse.json({
        hasActiveGame: false,
        message: 'No active game',
      })
    }

    // Get player's game result if they're in the game
    let playerGameResult = null
    if (userId || sessionId) {
      playerGameResult = await getActiveGameForPlayer(userId, sessionId)
    }

    return NextResponse.json({
      hasActiveGame: true,
      game: {
        id: currentGame.id,
        currentRound: currentGame.currentRound,
        status: currentGame.status,
        startedAt: currentGame.startedAt,
        totalPlayers: currentGame.results?.length || 0,
      },
      playerInGame: !!playerGameResult,
      playerGameResult: playerGameResult ? {
        id: playerGameResult.id,
        roundsCompleted: playerGameResult.roundsCompleted,
        isWinner: playerGameResult.isWinner,
        isEliminated: playerGameResult.roundResults.some(rr => rr.isEliminated),
      } : null,
    })
  } catch (error) {
    console.error('Error in game status endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to get game status' },
      { status: 500 }
    )
  }
}


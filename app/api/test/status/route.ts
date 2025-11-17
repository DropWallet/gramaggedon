import { NextResponse } from 'next/server'
import { getCurrentGame } from '@/lib/game-engine'
import { prisma } from '@/lib/db'

/**
 * Test endpoint to get current game status
 * Useful for debugging and testing
 */
export async function GET() {
  try {
    const currentGame = await getCurrentGame()

    if (!currentGame) {
      return NextResponse.json({
        hasActiveGame: false,
        message: 'No active game',
        queueCount: await prisma.gameQueue.count({
          where: {
            gameId: null,
            leftAt: null,
          },
        }),
      })
    }

    const queueCount = await prisma.gameQueue.count({
      where: {
        gameId: null,
        leftAt: null,
      },
    })

    const playerCount = currentGame.results?.length || 0
    const currentRoundAnagram = currentGame.anagrams.find(
      a => a.roundNumber === currentGame.currentRound
    )

    return NextResponse.json({
      hasActiveGame: true,
      game: {
        id: currentGame.id,
        status: currentGame.status,
        currentRound: currentGame.currentRound,
        maxRounds: currentGame.maxRounds,
        startedAt: currentGame.startedAt,
        playerCount,
        currentRoundAnagram: currentRoundAnagram ? {
          roundNumber: currentRoundAnagram.roundNumber,
          anagram: currentRoundAnagram.anagram,
          timeSeconds: currentRoundAnagram.timeSeconds,
          roundStartedAt: currentRoundAnagram.roundStartedAt,
          roundEndedAt: currentRoundAnagram.roundEndedAt,
          timeRemaining: currentRoundAnagram.roundEndedAt
            ? Math.max(0, Math.floor((currentRoundAnagram.roundEndedAt.getTime() - Date.now()) / 1000))
            : null,
        } : null,
      },
      queueCount,
    })
  } catch (error) {
    console.error('Error in test status endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


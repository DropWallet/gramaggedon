import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveGameForPlayer, getCurrentGame } from '@/lib/game-engine'
import { prisma } from '@/lib/db'

/**
 * GET endpoint to fetch full game data for a player
 * Returns complete game state including anagrams and round results
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    // Get sessionId from query params (for anonymous users)
    const { searchParams } = new URL(request.url)
    const sessionId = userId ? null : searchParams.get('sessionId')

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Must be logged in or have a session' },
        { status: 401 }
      )
    }

    // Get player's active game
    const gameResult = await getActiveGameForPlayer(userId, sessionId)

    if (!gameResult) {
      console.log('Game data not found - userId:', userId, 'sessionId:', sessionId)
      return NextResponse.json(
        { error: 'Not in an active game' },
        { status: 404 }
      )
    }
    
    console.log('Game data found - gameId:', gameResult.game.id, 'currentRound:', gameResult.game.currentRound, 'status:', gameResult.game.status)

    // Get total players and remaining players count
    const totalPlayers = await prisma.gameResult.count({
      where: { gameId: gameResult.game.id },
    })

    // Count remaining players (not eliminated in current round)
    const currentRound = gameResult.game.currentRound
    const allGameResults = await prisma.gameResult.findMany({
      where: { gameId: gameResult.game.id },
      include: {
        roundResults: {
          where: { roundNumber: currentRound },
        },
      },
    })

    const remainingPlayers = allGameResults.filter(result => {
      const currentRoundResult = result.roundResults.find(rr => rr.roundNumber === currentRound)
      return !currentRoundResult?.isEliminated
    }).length

    // Get submission attempts for stats calculation
    const submissionAttempts = await prisma.submissionAttempt.findMany({
      where: {
        gameResultId: gameResult.id,
      },
      select: {
        roundNumber: true,
        isCorrect: true,
        timeSinceRoundStart: true,
      },
      orderBy: {
        submittedAt: 'asc',
      },
    })

    // Format the response
    return NextResponse.json({
      id: gameResult.id,
      game: {
        id: gameResult.game.id,
        currentRound: gameResult.game.currentRound,
        status: gameResult.game.status,
        maxRounds: gameResult.game.maxRounds,
        anagrams: gameResult.game.anagrams.map(a => ({
          id: a.id,
          roundNumber: a.roundNumber,
          anagram: a.anagram,
          solution: a.solution,
          timeSeconds: a.timeSeconds,
          roundStartedAt: a.roundStartedAt?.toISOString() || null,
          roundEndedAt: a.roundEndedAt?.toISOString() || null,
        })),
      },
      roundResults: gameResult.roundResults.map(rr => ({
        id: rr.id,
        roundNumber: rr.roundNumber,
        isEliminated: rr.isEliminated,
        totalAttempts: rr.totalAttempts,
        correctAttempts: rr.correctAttempts,
      })),
      submissionAttempts: submissionAttempts.map(sa => ({
        roundNumber: sa.roundNumber,
        isCorrect: sa.isCorrect,
        timeSinceRoundStart: sa.timeSinceRoundStart,
      })),
      isWinner: gameResult.isWinner,
      totalPlayers,
      remainingPlayers,
    })
  } catch (error) {
    console.error('Error in game data endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to get game data' },
      { status: 500 }
    )
  }
}


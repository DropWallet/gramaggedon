import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateSolution, isWithinRateLimit, SUBMISSION_RATE_LIMIT_MS } from '@/lib/game'
import { getActiveGameForPlayer } from '@/lib/game-engine'
import { processRoundEnd, isFinalRound } from '@/lib/round-progression'

/**
 * POST endpoint for players to submit answers
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    // Get request body
    const body = await request.json()
    const { answer, sessionId } = body

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      )
    }

    // Get player's active game
    const gameResult = await getActiveGameForPlayer(userId, sessionId || null)

    if (!gameResult) {
      return NextResponse.json(
        { error: 'Not in an active game' },
        { status: 404 }
      )
    }

    const game = gameResult.game
    if (game.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Game is not in progress' },
        { status: 400 }
      )
    }

    // Check if player is eliminated
    const currentRoundResult = gameResult.roundResults.find(
      rr => rr.roundNumber === game.currentRound
    )

    if (currentRoundResult?.isEliminated) {
      return NextResponse.json(
        { error: 'You have been eliminated from this round' },
        { status: 400 }
      )
    }

    // Get current round anagram
    const roundAnagram = await prisma.gameAnagram.findUnique({
      where: {
        gameId_roundNumber: {
          gameId: game.id,
          roundNumber: game.currentRound,
        },
      },
    })

    if (!roundAnagram) {
      return NextResponse.json(
        { error: 'Round anagram not found' },
        { status: 404 }
      )
    }

    // Check if round has ended (for non-final rounds)
    const isFinal = isFinalRound(game)
    if (!isFinal && roundAnagram.roundEndedAt && new Date() >= roundAnagram.roundEndedAt) {
      return NextResponse.json(
        { error: 'Round has ended' },
        { status: 400 }
      )
    }

    // Check rate limiting (1 submission per second)
    const lastSubmission = await prisma.submissionAttempt.findFirst({
      where: {
        gameResultId: gameResult.id,
        roundNumber: game.currentRound,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    if (!isWithinRateLimit(lastSubmission?.submittedAt || null)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before submitting again.' },
        { status: 429 }
      )
    }

    // Validate the solution
    const normalizedAnswer = answer.trim().toLowerCase()
    const isValid = validateSolution(roundAnagram.anagram, normalizedAnswer)

    // Calculate time since round start
    const roundStartTime = roundAnagram.roundStartedAt || new Date()
    const timeSinceRoundStart = Math.floor((new Date().getTime() - roundStartTime.getTime()) / 1000)

    // Record the submission attempt
    const submissionAttempt = await prisma.submissionAttempt.create({
      data: {
        gameResultId: gameResult.id,
        roundNumber: game.currentRound,
        submittedAnswer: normalizedAnswer,
        isCorrect: isValid,
        submittedAt: new Date(),
        timeSinceRoundStart: timeSinceRoundStart,
      },
    })

    // Update round result
    const roundResult = await prisma.roundResult.upsert({
      where: {
        gameResultId_roundNumber: {
          gameResultId: gameResult.id,
          roundNumber: game.currentRound,
        },
      },
      create: {
        gameResultId: gameResult.id,
        roundNumber: game.currentRound,
        isEliminated: false,
        totalAttempts: 1,
        correctAttempts: isValid ? 1 : 0,
        firstCorrectSubmissionAt: isValid ? new Date() : null,
        finalCorrectAnswer: isValid ? normalizedAnswer : null,
      },
      update: {
        totalAttempts: {
          increment: 1,
        },
        correctAttempts: isValid
          ? {
              increment: 1,
            }
          : undefined,
        firstCorrectSubmissionAt: isValid && !currentRoundResult?.firstCorrectSubmissionAt
          ? new Date()
          : undefined,
        finalCorrectAnswer: isValid ? normalizedAnswer : undefined,
      },
    })

    // If this is the final round and the answer is correct, check for winner
    if (isFinal && isValid) {
      // Check if this player is the first to solve
      // We need to check all game results for this game
      const allCorrectSubmissions = await prisma.submissionAttempt.findMany({
        where: {
          gameResult: {
            gameId: game.id,
          },
          roundNumber: game.currentRound,
          isCorrect: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
        take: 1,
      })

      // If this is the first correct submission, process round end to declare winner
      if (allCorrectSubmissions.length === 1 && allCorrectSubmissions[0].id === submissionAttempt.id) {
        // This player is the winner!
        await processRoundEnd(game.id)
      }
    }

    // Get the correct word (solution) for this round
    // roundAnagram was already fetched earlier, so use it
    const correctWord = roundAnagram?.solution || ''

    return NextResponse.json({
      success: true,
      isCorrect: isValid,
      message: isValid ? 'Correct!' : 'Incorrect. Try again.',
      roundNumber: game.currentRound,
      isFinalRound: isFinal,
      totalAttempts: roundResult.totalAttempts,
      correctAttempts: roundResult.correctAttempts,
      correctWord: isValid ? correctWord : undefined,
    })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    )
  }
}


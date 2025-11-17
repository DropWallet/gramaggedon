import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with game results
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gameResults: {
          include: {
            submissionAttempts: {
              where: { isCorrect: true },
              select: {
                timeSinceRoundStart: true,
              },
            },
            roundResults: {
              select: {
                roundNumber: true,
                correctAttempts: true,
              },
            },
            game: {
              select: {
                status: true,
                anagrams: {
                  select: {
                    roundNumber: true,
                    roundStartedAt: true,
                    roundEndedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate stats directly from gameResults (not from cached user fields)
    const completedGames = user.gameResults.filter((gr) => {
      // A game is considered "played" if it has a game status of COMPLETED or if it has any round results
      return gr.game?.status === 'COMPLETED' || gr.roundResults.length > 0
    })

    const gameWins = completedGames.filter((gr) => gr.isWinner).length
    const gamesPlayed = completedGames.length
    const winPercentage = gamesPlayed > 0 ? Math.round((gameWins / gamesPlayed) * 100) : 0
    const dailyStreak = user.consecutiveDaysPlayed

    // Calculate total rounds completed and anagrams solved
    let totalRoundsCompleted = 0
    let totalAnagramsSolved = 0
    let totalWordTime = 0
    let wordTimeCount = 0
    let totalRoundTime = 0
    let roundTimeCount = 0

    user.gameResults.forEach((result) => {
      // Count rounds with at least one correct answer
      const completedRounds = result.roundResults.filter((rr) => rr.correctAttempts > 0)
      totalRoundsCompleted += completedRounds.length

      // Count total anagrams solved (correct attempts across all rounds)
      totalAnagramsSolved += result.roundResults.reduce((sum, rr) => sum + rr.correctAttempts, 0)

      // Calculate word times from submission attempts
      result.submissionAttempts.forEach((attempt) => {
        const wordTimeSeconds = Math.floor(attempt.timeSinceRoundStart / 1000)
        totalWordTime += wordTimeSeconds
        wordTimeCount++
      })

      // Calculate round times
      completedRounds.forEach((rr) => {
        const anagram = result.game.anagrams.find((a) => a.roundNumber === rr.roundNumber)
        if (anagram?.roundStartedAt && anagram?.roundEndedAt) {
          const start = new Date(anagram.roundStartedAt).getTime()
          const end = new Date(anagram.roundEndedAt).getTime()
          const roundTimeSeconds = Math.floor((end - start) / 1000)
          totalRoundTime += roundTimeSeconds
          roundTimeCount++
        }
      })
    })

    const avgWordTime = wordTimeCount > 0 ? Math.round(totalWordTime / wordTimeCount) : 0
    const avgRoundTime = roundTimeCount > 0 ? Math.round(totalRoundTime / roundTimeCount) : 0

    // Format time helper
    const formatTime = (seconds: number): string => {
      if (seconds < 60) {
        return `${seconds}s`
      }
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    }

    return NextResponse.json(
      {
        gameWins,
        winPercentage,
        gamesPlayed,
        dailyStreak,
        globalRank: user.worldRank || null,
        roundsCompleted: totalRoundsCompleted,
        anagramsSolved: totalAnagramsSolved,
        avgWordTime: formatTime(avgWordTime),
        avgRoundTime: formatTime(avgRoundTime),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}


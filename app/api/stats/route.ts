import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSolvedIndices, getSolvedEntries } from '@/lib/game-engine-v2'

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
                rounds: {
                  select: {
                    roundNumber: true,
                    startedAt: true,
                    endedAt: true,
                    words: {
                      select: {
                        solvedAt: true,
                        attempts: true,
                        index: true,
                      },
                    },
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

    // Filter to only daily games (v1 or v2)
    // Daily games are identified by having solvedWords (v2) or rounds with words (v1)
    const dailyGames = user.gameResults.filter((gr) => {
      // V2 daily game: has solvedWords field
      if (gr.solvedWords !== null) {
        return true
      }
      // V1 daily game: has rounds with words
      if (gr.game?.rounds && gr.game.rounds.length > 0) {
        return true
      }
      // Not a daily game (competitive game)
      return false
    })

    // Calculate completed games (v2: has completedAt, v1: has solved words)
    const completedGames = dailyGames.filter((gr) => {
      // V2: check if completedAt is set
      if (gr.solvedWords !== null) {
        return gr.completedAt !== null
      }
      // V1: check if any words were solved
      return gr.game?.rounds?.some(r => r.words.some(w => w.solvedAt)) || false
    })

    // Calculate game wins
    // For daily games: a "win" means completing all rounds (all words solved)
    // For competitive games: use isWinner flag
    const gameWins = completedGames.filter((gr) => {
      // V2 daily game: completedAt is only set when all rounds are complete
      if (gr.solvedWords !== null) {
        return gr.completedAt !== null
      }
      // V1 daily game: check if all words in all rounds are solved
      if (gr.game?.rounds && gr.game.rounds.length > 0) {
        return gr.game.rounds.every((round) => 
          round.words.every((word) => word.solvedAt !== null)
        )
      }
      // Competitive game: use isWinner flag
      return gr.isWinner
    }).length
    
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

    // Only process daily games (filter out competitive games)
    dailyGames.forEach((result) => {
      // V2 daily game: use solvedWords and roundStartTimes
      if (result.solvedWords !== null) {
        const solvedWords = result.solvedWords
        const roundStartTimes = result.roundStartTimes as Record<string, string> | null
        
        if (solvedWords) {
          // Count rounds and anagrams from solvedWords
          Object.keys(solvedWords).forEach((roundKey) => {
            const solvedIndices = getSolvedIndices(solvedWords, roundKey)
            if (solvedIndices.length > 0) {
              totalRoundsCompleted++
              totalAnagramsSolved += solvedIndices.length
              
              // Calculate round time if we have roundStartTimes
              if (roundStartTimes && roundStartTimes[roundKey]) {
                const roundStart = new Date(roundStartTimes[roundKey]).getTime()
                const roundNumber = parseInt(roundKey, 10)
                
                // Estimate round end time
                // For the last completed round, use completedAt if available
                // Otherwise try to use next round's start time, or estimate
                let roundEndTime: number
                const totalRounds = result.game?.rounds?.length || 0
                if (result.completedAt && roundNumber === totalRounds) {
                  // Last round and game is completed - use completedAt
                  roundEndTime = new Date(result.completedAt).getTime()
                } else {
                  // Try to use next round's start time for accurate completion time
                  const nextRoundKey = String(roundNumber + 1)
                  const nextRoundStartTime = roundStartTimes[nextRoundKey]
                  if (nextRoundStartTime) {
                    roundEndTime = new Date(nextRoundStartTime).getTime()
                  } else {
                    // Estimate: assume 180 seconds per round (v2 default)
                    const round = result.game?.rounds?.find(r => r.roundNumber === roundNumber)
                    if (round?.endedAt) {
                      roundEndTime = new Date(round.endedAt).getTime()
                    } else {
                      roundEndTime = roundStart + (180 * 1000)
                    }
                  }
                }
                
                const roundTimeSeconds = Math.floor((roundEndTime - roundStart) / 1000)
                totalRoundTime += roundTimeSeconds
                roundTimeCount++
                
                // Calculate word times: use precise timestamps if available, otherwise estimate
                const solvedEntries = getSolvedEntries(solvedWords, roundKey)
                const hasPreciseTimestamps = solvedEntries.length > 0 && solvedEntries[0].solvedAt
                
                if (hasPreciseTimestamps) {
                  // Use precise timestamps
                  solvedEntries.forEach(entry => {
                    const solvedTime = new Date(entry.solvedAt).getTime()
                    const wordTimeSeconds = Math.floor((solvedTime - roundStart) / 1000)
                    totalWordTime += wordTimeSeconds
                    wordTimeCount++
                  })
                } else {
                  // Fallback: estimate word times by distributing round time evenly
                  const wordsInRound = solvedIndices.length
                  if (wordsInRound > 0 && roundTimeSeconds > 0) {
                    const avgTimePerWord = Math.floor(roundTimeSeconds / wordsInRound)
                    solvedIndices.forEach(() => {
                      totalWordTime += avgTimePerWord
                      wordTimeCount++
                    })
                  }
                }
              }
            }
          })
        }
      } else if (result.game?.rounds && result.game.rounds.length > 0) {
        // V1 daily game: calculate from rounds and words
        result.game.rounds.forEach((round) => {
          const solvedWords = round.words.filter((w) => w.solvedAt !== null)
          if (solvedWords.length > 0) {
            totalRoundsCompleted++
            totalAnagramsSolved += solvedWords.length
            
            if (round.startedAt) {
              const roundStart = new Date(round.startedAt).getTime()
              solvedWords.forEach((word) => {
                if (word.solvedAt) {
                  const solvedTime = new Date(word.solvedAt).getTime()
                  const wordTimeSeconds = Math.floor((solvedTime - roundStart) / 1000)
                  totalWordTime += wordTimeSeconds
                  wordTimeCount++
                }
              })
              
              let roundEndTime: number
              if (round.endedAt) {
                roundEndTime = new Date(round.endedAt).getTime()
              } else {
                const lastSolved = solvedWords
                  .map((w) => w.solvedAt ? new Date(w.solvedAt).getTime() : 0)
                  .sort((a, b) => b - a)[0]
                roundEndTime = lastSolved || new Date().getTime()
              }
              const roundTimeSeconds = Math.floor((roundEndTime - roundStart) / 1000)
              totalRoundTime += roundTimeSeconds
              roundTimeCount++
            }
          }
        })
      }
      // Note: Competitive games are filtered out above, so we don't process them here
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


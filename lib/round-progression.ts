/**
 * Round Progression Logic
 * Handles advancing rounds, eliminations, and determining winners
 */

import { prisma } from './db'
import { DEFAULT_GAME_CONFIG, getRoundConfig, ROUND_COUNTDOWN_SECONDS } from './game'

/**
 * Check if a round is the final round (special win condition)
 */
export function isFinalRound(game: { maxRounds: number; currentRound: number }): boolean {
  return game.currentRound >= game.maxRounds
}

/**
 * Get the anagram length for the final round (always 9 letters)
 */
export function getFinalRoundLength(): number {
  return 9
}

/**
 * Process the end of a round:
 * - Mark players who didn't solve as eliminated
 * - Advance to next round or end game
 */
export async function processRoundEnd(gameId: string): Promise<{
  nextRound: number | null
  eliminatedCount: number
  remainingPlayers: number
  winner: string | null
}> {
  const gameData = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      results: {
        include: {
          roundResults: true, // Get all round results, we'll filter in code
        },
      },
    },
  })

  if (!gameData || gameData.status !== 'IN_PROGRESS') {
    throw new Error('Game not found or not in progress')
  }

  const currentRound = gameData.currentRound

  // Get the current round anagram separately
  const roundAnagram = await prisma.gameAnagram.findUnique({
    where: {
      gameId_roundNumber: {
        gameId,
        roundNumber: currentRound,
      },
    },
  })

  const roundEndTime = roundAnagram?.roundEndedAt || new Date()

  // Get all active players (not eliminated in previous rounds)
  const activeResults = gameData.results.filter(result => {
    // Check if player was eliminated in any previous round
    const wasEliminated = result.roundResults.some(
      rr => rr.roundNumber < currentRound && rr.isEliminated
    )
    return !wasEliminated && !result.isWinner
  })

  let eliminatedCount = 0
  let winner: string | null = null

  // Check if this is the final round
  const isFinal = isFinalRound(gameData)

  if (isFinal) {
    // Final round: first person to solve wins
    // Find the first player who solved correctly
    const solvedResults = activeResults
      .map(result => {
        const roundResult = result.roundResults.find(rr => rr.roundNumber === currentRound)
        if (roundResult && roundResult.correctAttempts > 0 && roundResult.firstCorrectSubmissionAt) {
          return {
            result,
            roundResult,
            solvedAt: roundResult.firstCorrectSubmissionAt,
          }
        }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => a!.solvedAt.getTime() - b!.solvedAt.getTime())

    if (solvedResults.length > 0) {
      // We have a winner!
      const winnerResult = solvedResults[0]!.result
      winner = winnerResult.id

      // Mark winner
      await prisma.gameResult.update({
        where: { id: winnerResult.id },
        data: {
          isWinner: true,
          finalRound: currentRound,
          roundsCompleted: currentRound,
        },
      })

      // Mark all other players as eliminated
      for (const result of activeResults) {
        if (result.id !== winner) {
          const roundResult = result.roundResults.find(rr => rr.roundNumber === currentRound)
          if (roundResult) {
            await prisma.roundResult.update({
              where: { id: roundResult.id },
              data: {
                isEliminated: true,
                eliminatedAt: roundEndTime,
              },
            })
          } else {
            // Create round result if it doesn't exist
            await prisma.roundResult.create({
              data: {
                gameResultId: result.id,
                roundNumber: currentRound,
                isEliminated: true,
                eliminatedAt: roundEndTime,
                totalAttempts: 0,
                correctAttempts: 0,
              },
            })
          }
          eliminatedCount++
        }
      }

      // End the game
      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      })

      return {
        nextRound: null,
        eliminatedCount,
        remainingPlayers: 1,
        winner,
      }
    } else {
      // No one solved - everyone eliminated (shouldn't happen, but handle it)
      for (const result of activeResults) {
        const roundResult = result.roundResults.find(rr => rr.roundNumber === currentRound)
        if (roundResult) {
          await prisma.roundResult.update({
            where: { id: roundResult.id },
            data: {
              isEliminated: true,
              eliminatedAt: roundEndTime,
            },
          })
        }
        eliminatedCount++
      }

      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      })

      return {
        nextRound: null,
        eliminatedCount,
        remainingPlayers: 0,
        winner: null,
      }
    }
  } else {
    // Regular round: eliminate players who didn't solve
    for (const result of activeResults) {
      const roundResult = result.roundResults.find(rr => rr.roundNumber === currentRound)
      const solved = roundResult && roundResult.correctAttempts > 0

      if (!solved) {
        // Player didn't solve - eliminate them
        if (roundResult) {
          await prisma.roundResult.update({
            where: { id: roundResult.id },
            data: {
              isEliminated: true,
              eliminatedAt: roundEndTime,
            },
          })
        } else {
          // Create round result if it doesn't exist
          await prisma.roundResult.create({
            data: {
              gameResultId: result.id,
              roundNumber: currentRound,
              isEliminated: true,
              eliminatedAt: roundEndTime,
              totalAttempts: 0,
              correctAttempts: 0,
            },
          })
        }

        // Update game result
        await prisma.gameResult.update({
          where: { id: result.id },
          data: {
            finalRound: currentRound,
            roundsCompleted: currentRound - 1, // They completed previous rounds
          },
        })

        eliminatedCount++
      } else {
        // Player solved - update rounds completed
        await prisma.gameResult.update({
          where: { id: result.id },
          data: {
            roundsCompleted: currentRound,
          },
        })
      }
    }

    // Check if only one player remains (but only end early if there were multiple players to start)
    const remainingPlayers = activeResults.length - eliminatedCount
    const totalPlayers = gameData.results.length

    // Only end early if:
    // 1. There are 0 remaining players (everyone eliminated), OR
    // 2. There were multiple players and only 1 remains (battle royale win condition)
    // For single-player games, continue through all rounds
    if (remainingPlayers === 0) {
      // Everyone eliminated - no winner
      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      })

      return {
        nextRound: null,
        eliminatedCount,
        remainingPlayers: 0,
        winner: null,
      }
    } else if (remainingPlayers === 1 && totalPlayers > 1) {
      // Only one player left in a multi-player game - they win
      const winnerResult = activeResults.find(
        result => !result.roundResults.some(rr => rr.roundNumber === currentRound && rr.isEliminated)
      )

      if (winnerResult) {
        winner = winnerResult.id
        await prisma.gameResult.update({
          where: { id: winnerResult.id },
          data: {
            isWinner: true,
            finalRound: currentRound,
            roundsCompleted: currentRound,
          },
        })
      }

      // End the game
      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      })

      return {
        nextRound: null,
        eliminatedCount,
        remainingPlayers: 1,
        winner,
      }
    }
    // If remainingPlayers === 1 && totalPlayers === 1, continue to next round (single-player mode)

    // Advance to next round
    const nextRound = currentRound + 1
    const nextRoundConfig = getRoundConfig(nextRound, {
      initialTimeSeconds: gameData.initialTimeSeconds,
      timeDecreasePerRound: gameData.timeDecreasePerRound,
      initialAnagramLength: gameData.initialAnagramLength,
      lengthIncreasePerRound: gameData.lengthIncreasePerRound,
      maxRounds: gameData.maxRounds,
    })

    // Check if next round is final round
    const nextIsFinal = nextRound >= gameData.maxRounds

    // Calculate when next round should start (after countdown)
    const nextRoundStartTime = new Date(roundEndTime.getTime() + ROUND_COUNTDOWN_SECONDS * 1000)
    const nextRoundEndTime = nextIsFinal
      ? null // Final round has no end time (first to solve wins)
      : new Date(nextRoundStartTime.getTime() + nextRoundConfig.timeSeconds * 1000)

    // Update next round anagram with start/end times
    const nextRoundAnagram = await prisma.gameAnagram.findUnique({
      where: {
        gameId_roundNumber: {
          gameId,
          roundNumber: nextRound,
        },
      },
    })

    if (nextRoundAnagram) {
      await prisma.gameAnagram.update({
        where: { id: nextRoundAnagram.id },
        data: {
          roundStartedAt: nextRoundStartTime,
          roundEndedAt: nextRoundEndTime,
        },
      })
    }

    // Create round results for all remaining players
    for (const result of activeResults) {
      if (!result.roundResults.some(rr => rr.roundNumber === currentRound && rr.isEliminated)) {
        // Player is still in - create next round result
        await prisma.roundResult.upsert({
          where: {
            gameResultId_roundNumber: {
              gameResultId: result.id,
              roundNumber: nextRound,
            },
          },
          create: {
            gameResultId: result.id,
            roundNumber: nextRound,
            isEliminated: false,
            totalAttempts: 0,
            correctAttempts: 0,
          },
          update: {
            // Round result already exists, just ensure it's not eliminated
            isEliminated: false,
          },
        })
      }
    }

    // Update game to next round
    await prisma.game.update({
      where: { id: gameId },
      data: {
        currentRound: nextRound,
      },
    })

    return {
      nextRound,
      eliminatedCount,
      remainingPlayers,
      winner: null,
    }
  }
}

/**
 * Check if a round has ended (time limit reached, or final round winner found)
 */
export async function checkRoundEnd(gameId: string): Promise<boolean> {
  const gameData = await prisma.game.findUnique({
    where: { id: gameId },
  })

  if (!gameData || gameData.status !== 'IN_PROGRESS') {
    return false
  }

  const roundAnagram = await prisma.gameAnagram.findUnique({
    where: {
      gameId_roundNumber: {
        gameId,
        roundNumber: gameData.currentRound,
      },
    },
  })

  if (!roundAnagram) {
    return false
  }

  const now = new Date()
  const isFinal = isFinalRound(gameData)

  if (isFinal) {
    // Final round: check if anyone has solved
    const winner = await prisma.gameResult.findFirst({
      where: {
        gameId,
        isWinner: true,
      },
    })

    return !!winner
  } else {
    // Regular round: check if time limit has passed
    if (roundAnagram.roundEndedAt) {
      return now >= roundAnagram.roundEndedAt
    }
    return false
  }
}


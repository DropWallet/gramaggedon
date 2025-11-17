/**
 * Game Engine - Handles starting games, round progression, and game state management
 */

import { prisma } from './db'
import { 
  DEFAULT_GAME_CONFIG, 
  getRoundConfig, 
  generateAnagram,
  ROUND_COUNTDOWN_SECONDS,
  getUKTime
} from './game'
import { getNextGameTime } from './game-schedule'

import { addDays, startOfDay } from 'date-fns'
import { getRandomWord } from './words'

/**
 * Start a new game with all players currently in the queue
 * This is called by the scheduler at game start time
 */
export async function startGame(): Promise<{ gameId: string; playerCount: number } | null> {
  try {
    // Get all players in queue (gameId is null)
    const queueEntries = await prisma.gameQueue.findMany({
      where: {
        gameId: null,
        leftAt: null, // Not left the queue
      },
      orderBy: {
        joinedAt: 'asc', // First come, first served
      },
    })

    if (queueEntries.length === 0) {
      console.log('No players in queue to start game')
      return null
    }

    const now = new Date()
    const nextGameTime = getNextGameTime()
    
    // Determine game type (MORNING or EVENING)
    const ukTime = getUKTime()
    const gameType = ukTime.getHours() < 12 ? 'MORNING' : 'EVENING'

    // Create the game record
    const game = await prisma.game.create({
      data: {
        gameType,
        scheduledAt: nextGameTime,
        startedAt: now,
        status: 'IN_PROGRESS',
        queueOpensAt: new Date(nextGameTime.getTime() - 15 * 60 * 1000), // 15 minutes before
        currentRound: 1,
        maxRounds: DEFAULT_GAME_CONFIG.maxRounds,
        initialTimeSeconds: DEFAULT_GAME_CONFIG.initialTimeSeconds,
        timeDecreasePerRound: DEFAULT_GAME_CONFIG.timeDecreasePerRound,
        initialAnagramLength: DEFAULT_GAME_CONFIG.initialAnagramLength,
        lengthIncreasePerRound: DEFAULT_GAME_CONFIG.lengthIncreasePerRound,
      },
    })

    // Pre-generate anagrams for all rounds
    const anagrams = []
    for (let round = 1; round <= DEFAULT_GAME_CONFIG.maxRounds; round++) {
      // Final round is always 9 letters, no timer
      const isFinalRound = round >= DEFAULT_GAME_CONFIG.maxRounds
      let anagramLength = isFinalRound ? 9 : getRoundConfig(round).length
      
      // Ensure we don't exceed 9 letters (max in our word list)
      // Round progression: 5, 6, 7, 8, 9, 9, 9, 9, 9, 9
      if (anagramLength > 9) {
        anagramLength = 9
      }
      
      const timeSeconds = isFinalRound ? 0 : getRoundConfig(round).timeSeconds // 0 = no timer
      
      const { anagram: shuffled, solution } = generateAnagram(anagramLength)
      
      const gameAnagram = await prisma.gameAnagram.create({
        data: {
          gameId: game.id,
          roundNumber: round,
          anagram: shuffled,
          solution: solution,
          timeSeconds: timeSeconds,
          roundStartedAt: null, // Will be set when round actually starts
          roundEndedAt: null, // Final round has no end time
        },
      })
      anagrams.push(gameAnagram)
    }

    // Calculate when round 1 should start (immediately)
    const round1StartTime = now
    const round1Config = getRoundConfig(1)
    // Round 1 is not the final round, so it has a timer
    const round1EndTime = new Date(round1StartTime.getTime() + round1Config.timeSeconds * 1000)

    // Update round 1 anagram with start/end times
    await prisma.gameAnagram.update({
      where: { id: anagrams[0].id },
      data: {
        roundStartedAt: round1StartTime,
        roundEndedAt: round1EndTime,
      },
    })

    // Move players from queue to game and create game results
    const gameResults = []
    for (const queueEntry of queueEntries) {
      // Update queue entry with gameId
      await prisma.gameQueue.update({
        where: { id: queueEntry.id },
        data: { gameId: game.id },
      })

      // Create game result
      const gameResult = await prisma.gameResult.create({
        data: {
          gameId: game.id,
          userId: queueEntry.userId,
          sessionId: queueEntry.sessionId,
          isAnonymous: !queueEntry.userId,
          canBeClaimed: !queueEntry.userId,
          expiresAt: !queueEntry.userId 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
            : null,
          finalRound: null, // Will be updated as game progresses
          roundsCompleted: 0,
          isWinner: false,
        },
      })
      gameResults.push(gameResult)

      // Create initial round result for round 1
      // Round results will be created/updated as players submit answers
      // For now, we'll create it with default values
      await prisma.roundResult.create({
        data: {
          gameResultId: gameResult.id,
          roundNumber: 1,
          isEliminated: false,
          totalAttempts: 0,
          correctAttempts: 0,
        },
      })
    }

    console.log(`Game ${game.id} started with ${gameResults.length} players`)

    return {
      gameId: game.id,
      playerCount: gameResults.length,
    }
  } catch (error) {
    console.error('Error starting game:', error)
    throw error
  }
}

/**
 * Get the current active game (if any)
 */
export async function getCurrentGame() {
  return await prisma.game.findFirst({
    where: {
      status: 'IN_PROGRESS',
    },
    include: {
      anagrams: {
        orderBy: {
          roundNumber: 'asc',
        },
      },
      results: {
        include: {
          roundResults: {
            orderBy: {
              roundNumber: 'asc',
            },
          },
        },
      },
    },
  })
}

/**
 * Get active game for a specific user/session
 */
export async function getActiveGameForPlayer(userId: string | null, sessionId: string | null) {
  if (!userId && !sessionId) {
    return null
  }

  const gameResult = await prisma.gameResult.findFirst({
    where: {
      OR: [
        userId ? { userId, game: { status: 'IN_PROGRESS' } } : {},
        sessionId ? { sessionId, game: { status: 'IN_PROGRESS' } } : {},
      ],
    },
    include: {
      game: {
        include: {
          anagrams: {
            orderBy: {
              roundNumber: 'asc',
            },
          },
        },
      },
      roundResults: {
        orderBy: {
          roundNumber: 'asc',
        },
      },
      submissionAttempts: {
        select: {
          roundNumber: true,
          isCorrect: true,
          timeSinceRoundStart: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
      },
    },
  })

  return gameResult
}

// ======================
// Single-player daily mode
// ======================

function spRoundLengths(round: number): number[] {
  if (round === 1) return [5, 5, 5, 5]
  if (round === 2) return [6, 6, 6, 6]
  if (round === 3) return [7, 7, 7, 7]
  return [8, 8, 8, 8]
}

export async function ensureDailyGameForPlayer(userId?: string | null, sessionId?: string | null) {
  // Always create a fresh game - no checking for existing games
  // If user refreshes or leaves mid-game, they start fresh (which is fine for daily game)
  // This eliminates all the complexity and bugs from trying to reset existing games
  const game = await prisma.game.create({
    data: {
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      currentRound: 1,
      maxRounds: 4,
      roundTimeSeconds: 120,
      gameType: 'MORNING',
      scheduledAt: new Date(),
      queueOpensAt: new Date(),
    },
  })

  for (let r = 1; r <= 4; r++) {
    const round = await prisma.gameRound.create({
      data: {
        gameId: game.id,
        roundNumber: r,
        timeSeconds: 120,
        startedAt: r === 1 ? new Date() : null,
      },
    })
    const lengths = spRoundLengths(r)
    for (let i = 0; i < 4; i++) {
      const len = lengths[i]
      const solution = getRandomWord(len)
      const anagram = solution.split('').sort(() => Math.random() - 0.5).join('')
      await prisma.roundWord.create({
        data: { gameRoundId: round.id, index: i + 1, anagram, solution },
      })
    }
  }

  const result = await prisma.gameResult.create({
    data: {
      gameId: game.id,
      userId: userId || undefined,
      sessionId: userId ? undefined : sessionId || undefined,
    },
  })

  const fullGame = await prisma.game.findUnique({
    where: { id: game.id },
    include: { rounds: { include: { words: true }, orderBy: { roundNumber: 'asc' } } },
  })
  return { game: fullGame!, result }
}

export async function getActiveDailyGame(userId?: string | null, sessionId?: string | null) {
  // Simplified: just return the most recent active game for today, or null if none exists
  // No reset logic - if game is in invalid state, client should call /api/daily/start to create fresh game
  const today = startOfDay(new Date())
  const tomorrow = addDays(today, 1)
  
  // Build OR condition properly - avoid undefined values in OR array
  const orConditions = []
  if (userId) {
    orConditions.push({ userId })
  }
  if (sessionId) {
    orConditions.push({ sessionId })
  }
  
  if (orConditions.length === 0) {
    return null
  }
  
  return prisma.gameResult.findFirst({
    where: {
      OR: orConditions,
      game: { 
        startedAt: { gte: today, lt: tomorrow }, 
        status: { not: 'COMPLETED' }
      },
    },
    orderBy: { game: { startedAt: 'desc' } },
    include: { game: { include: { rounds: { include: { words: true }, orderBy: { roundNumber: 'asc' } } } } },
  })
}

export async function submitDailyAnswer(opts: { gameId: string; roundNumber: number; guess: string }) {
  const { gameId, roundNumber, guess } = opts
  // First fetch the game to get the actual currentRound from the database
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { rounds: { include: { words: true }, orderBy: { roundNumber: 'asc' } } },
  })
  if (!game) throw new Error('Game not found')
  
  // Use the database's currentRound, not the client-provided roundNumber
  // This prevents issues where client has stale data
  const actualRoundNumber = game.currentRound
  const round = game.rounds.find(r => r.roundNumber === actualRoundNumber)
  if (!round) throw new Error(`Round ${actualRoundNumber} not found`)

  const currentWord = round.words.find(w => !w.solvedAt)
  if (!currentWord) return { isCorrect: false, message: 'Round already complete' }

  await prisma.roundWord.update({ where: { id: currentWord.id }, data: { attempts: { increment: 1 } } })

  const norm = (s: string) => s.trim().toLowerCase()
  const normalizedGuess = norm(guess)
  const normalizedSolution = norm(currentWord.solution)
  const isCorrect = normalizedGuess === normalizedSolution
  
  // Log mismatch for debugging
  if (!isCorrect) {
    console.warn('Answer mismatch:', {
      gameId,
      roundNumber: actualRoundNumber,
      clientProvidedRoundNumber: roundNumber,
      wordIndex: currentWord.index,
      anagram: currentWord.anagram,
      solution: currentWord.solution,
      guess: normalizedGuess,
      expected: normalizedSolution
    })
  }
  
  if (!isCorrect) return { isCorrect: false, message: 'Nope! Try again.' }

  await prisma.roundWord.update({ where: { id: currentWord.id }, data: { solvedAt: new Date() } })

  const updated = await prisma.roundWord.findMany({ where: { gameRoundId: round.id } })
  const roundComplete = updated.every(w => w.solvedAt)

  if (!roundComplete) return { isCorrect: true, roundComplete: false, solvedWord: currentWord.solution }

  const result = await prisma.gameResult.findFirst({ where: { gameId } })
  const newRoundsCompleted = (result?.roundsCompleted || 0) + 1
  await prisma.gameResult.update({ where: { id: result!.id }, data: { roundsCompleted: newRoundsCompleted } })

  if (actualRoundNumber < game.maxRounds) {
    const nextRound = actualRoundNumber + 1
    await prisma.game.update({ where: { id: gameId }, data: { currentRound: nextRound } })
    // Do not auto-start next round; client will trigger after interim
    // await prisma.gameRound.updateMany({ where: { gameId, roundNumber: nextRound }, data: { startedAt: new Date() } })
    return { isCorrect: true, roundComplete: true, nextRound }
  }

  await prisma.game.update({ where: { id: gameId }, data: { status: 'COMPLETED', endedAt: new Date() } })
  await prisma.gameResult.update({ where: { id: result!.id }, data: { completedAt: new Date() } })
  return { isCorrect: true, roundComplete: true, isGameComplete: true }
}

export async function startCurrentRoundNow(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) throw new Error('Game not found')
  const cur = await prisma.gameRound.findFirst({ where: { gameId, roundNumber: game.currentRound } })
  if (!cur) throw new Error('Round not found')
  await prisma.gameRound.update({ where: { id: cur.id }, data: { startedAt: new Date(), endedAt: null } })
  return { ok: true }
}


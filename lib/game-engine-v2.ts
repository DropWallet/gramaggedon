/**
 * Game Engine V2 - Simplified Wordle-like daily game
 * 
 * Key simplifications:
 * - No shared Game.currentRound (each user tracks their own)
 * - No Round.startedAt/endedAt (use GameResult.roundStartTimes only)
 * - Refresh = fail (no resume logic)
 * - Simple timer calculation
 */

import { prisma } from './db'
import { startOfDay, addDays } from 'date-fns'
import { getRandomWord } from './words'

/**
 * Type definitions for solvedWords
 * Old format: Record<string, number[]> - e.g., { "1": [1, 2, 3] }
 * New format: Record<string, Array<{ index: number, solvedAt: string }>> - e.g., { "1": [{ index: 1, solvedAt: "..." }] }
 */
type SolvedWordEntry = { index: number; solvedAt: string }
type SolvedWordsOld = Record<string, number[]>
type SolvedWordsNew = Record<string, SolvedWordEntry[]>
type SolvedWords = SolvedWordsOld | SolvedWordsNew

/**
 * Helper: Check if solvedWords uses new format (with timestamps)
 */
function isNewFormat(solvedWords: SolvedWords | null): solvedWords is SolvedWordsNew {
  if (!solvedWords || Object.keys(solvedWords).length === 0) return false
  const firstRound = Object.values(solvedWords)[0]
  return Array.isArray(firstRound) && firstRound.length > 0 && typeof firstRound[0] === 'object' && 'solvedAt' in firstRound[0]
}

/**
 * Helper: Get word indices from solvedWords (handles both old and new formats)
 */
function getSolvedIndices(solvedWords: SolvedWords | null, roundKey: string): number[] {
  if (!solvedWords) return []
  const roundData = solvedWords[roundKey]
  if (!roundData) return []
  
  if (isNewFormat(solvedWords)) {
    return (roundData as SolvedWordEntry[]).map(entry => entry.index).sort((a, b) => a - b)
  } else {
    return (roundData as number[]).sort((a, b) => a - b)
  }
}

/**
 * Helper: Get solved word entries with timestamps (converts old format to new if needed)
 */
function getSolvedEntries(solvedWords: SolvedWords | null, roundKey: string): SolvedWordEntry[] {
  if (!solvedWords) return []
  const roundData = solvedWords[roundKey]
  if (!roundData) return []
  
  if (isNewFormat(solvedWords)) {
    return (roundData as SolvedWordEntry[]).sort((a, b) => a.index - b.index)
  } else {
    // Convert old format to new format (use current time as fallback for old data)
    const indices = roundData as number[]
    const now = new Date().toISOString()
    return indices.map(index => ({ index, solvedAt: now })).sort((a, b) => a.index - b.index)
  }
}

// Export helpers for use in other files
export { getSolvedIndices, getSolvedEntries, isNewFormat }
export type { SolvedWords, SolvedWordsNew, SolvedWordEntry }

/**
 * Get or create today's shared puzzle
 * One puzzle per day, shared across all players
 */
async function getOrCreateTodayPuzzle() {
  const today = startOfDay(new Date())
  const tomorrow = addDays(today, 1)
  
  // Check for existing v2 puzzle (3 rounds, 3 words each)
  // Filter by maxRounds: 3 to ensure we only get v2 puzzles, not old v1 puzzles (4 rounds)
  const existing = await prisma.game.findFirst({
    where: {
      scheduledAt: { gte: today, lt: tomorrow },
      maxRounds: 3, // Only v2 puzzles have 3 rounds
    },
    include: {
      rounds: {
        include: { words: true },
        orderBy: { roundNumber: 'asc' }
      }
    }
  })
  
  if (existing) return existing
  
  // Create new puzzle (3 rounds, 3 words each, 5/6/7 letters)
  const game = await prisma.game.create({
    data: {
      scheduledAt: today,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      maxRounds: 3,
      roundTimeSeconds: 180,
      gameType: 'MORNING',
      queueOpensAt: today,
      rounds: {
        create: [
          // Round 1: 3 words of 5 letters
          {
            roundNumber: 1,
            timeSeconds: 180,
            words: {
              create: Array.from({ length: 3 }, (_, i) => {
                const solution = getRandomWord(5)
                let anagram = solution
                let attempts = 0
                while (anagram === solution && attempts < 20) {
                  anagram = solution.split('').sort(() => Math.random() - 0.5).join('')
                  attempts++
                }
                if (anagram === solution) anagram = solution.split('').reverse().join('')
                return { index: i + 1, anagram, solution }
              })
            }
          },
          // Round 2: 3 words of 6 letters
          {
            roundNumber: 2,
            timeSeconds: 180,
            words: {
              create: Array.from({ length: 3 }, (_, i) => {
                const solution = getRandomWord(6)
                let anagram = solution
                let attempts = 0
                while (anagram === solution && attempts < 20) {
                  anagram = solution.split('').sort(() => Math.random() - 0.5).join('')
                  attempts++
                }
                if (anagram === solution) anagram = solution.split('').reverse().join('')
                return { index: i + 1, anagram, solution }
              })
            }
          },
          // Round 3: 3 words of 7 letters
          {
            roundNumber: 3,
            timeSeconds: 180,
            words: {
              create: Array.from({ length: 3 }, (_, i) => {
                const solution = getRandomWord(7)
                let anagram = solution
                let attempts = 0
                while (anagram === solution && attempts < 20) {
                  anagram = solution.split('').sort(() => Math.random() - 0.5).join('')
                  attempts++
                }
                if (anagram === solution) anagram = solution.split('').reverse().join('')
                return { index: i + 1, anagram, solution }
              })
            }
          }
        ]
      }
    },
    include: {
      rounds: {
        include: { words: true },
        orderBy: { roundNumber: 'asc' }
      }
    }
  })
  
  return game
}

/**
 * Get user's current game state
 * Returns GameResult with full game data
 */
// Helper function to count total solved words in a game result
function countSolvedWords(result: { solvedWords: SolvedWords | null; game: { rounds: Array<{ roundNumber: number }> } }): number {
  if (!result.solvedWords) return 0
  const solvedWords = result.solvedWords as SolvedWords
  let total = 0
  for (const round of result.game.rounds) {
    const roundKey = String(round.roundNumber)
    const solved = getSolvedIndices(solvedWords, roundKey)
    total += solved.length
  }
  return total
}

export async function getDailyGameV2(userId?: string | null, sessionId?: string | null) {
  const puzzle = await getOrCreateTodayPuzzle()
  
  if (!userId && !sessionId) {
    throw new Error('Must provide userId or sessionId')
  }
  
  let result: any = null
  let anonymousResult: any = null
  let userIdResult: any = null
  
  // When both userId and sessionId are provided, check for games separately
  // This ensures we can claim anonymous games even if a userId game exists
  if (userId && sessionId) {
    // Get today's date range for filtering
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    
    // First, check for anonymous game with this sessionId created today
    anonymousResult = await prisma.gameResult.findFirst({
      where: {
        gameId: puzzle.id,
        sessionId: sessionId,
        userId: null, // Only anonymous games
        createdAt: { gte: today, lt: tomorrow }, // Only today's games
      },
      include: {
        game: {
          include: {
            rounds: {
              include: { words: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        }
      }
    })
    
    // Then, check for userId game
    userIdResult = await prisma.gameResult.findFirst({
      where: {
        gameId: puzzle.id,
        userId: userId,
      },
      include: {
        game: {
          include: {
            rounds: {
              include: { words: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        }
      }
    })
    
    // If both exist, decide which to keep (prefer the one with more progress)
    if (anonymousResult && userIdResult) {
      const anonymousProgress = countSolvedWords(anonymousResult)
      const userIdProgress = countSolvedWords(userIdResult)
      
      if (anonymousProgress > userIdProgress) {
        // Anonymous game has more progress - delete userId game and claim anonymous
        await prisma.gameResult.delete({ where: { id: userIdResult.id } })
        result = await prisma.gameResult.update({
          where: { id: anonymousResult.id },
          data: {
            userId: userId,
            sessionId: null,
          },
          include: {
            game: {
              include: {
                rounds: {
                  include: { words: true },
                  orderBy: { roundNumber: 'asc' }
                }
              }
            }
          }
        })
      } else {
        // UserId game has equal or more progress - delete anonymous game and use userId
        await prisma.gameResult.delete({ where: { id: anonymousResult.id } })
        result = userIdResult
      }
    } else if (anonymousResult) {
      // Only anonymous game exists - claim it
      result = await prisma.gameResult.update({
        where: { id: anonymousResult.id },
        data: {
          userId: userId,
          sessionId: null,
        },
        include: {
          game: {
            include: {
              rounds: {
                include: { words: true },
                orderBy: { roundNumber: 'asc' }
              }
            }
          }
        }
      })
    } else if (userIdResult) {
      // Only userId game exists - use it
      result = userIdResult
    }
  } else {
    // Only one identifier provided - use OR condition
    const orConditions = []
    if (userId) orConditions.push({ userId })
    if (sessionId) orConditions.push({ sessionId })
    
    result = await prisma.gameResult.findFirst({
      where: {
        gameId: puzzle.id,
        OR: orConditions,
      },
      include: {
        game: {
          include: {
            rounds: {
              include: { words: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        }
      }
    })
  }
  
  // If result exists and game is successfully completed, return it (don't create new)
  if (result && result.completedAt) {
    const solvedWords = (result.solvedWords as SolvedWords | null) || {}
    const allRoundsComplete = result.game.rounds.every((r: typeof result.game.rounds[0]) => {
      const roundKey = String(r.roundNumber)
      const solved = getSolvedIndices(solvedWords, roundKey)
      return solved.length === r.words.length
    })
    if (allRoundsComplete) {
      // Game successfully completed, return it
      return result
    }
    // If completedAt is set but not all words solved, delete it and create new
    await prisma.gameResult.delete({ where: { id: result.id } })
    result = null // Will create new one below
  }
  
  // If no result exists, or result was deleted, create one (user starting fresh)
  if (!result) {
    const roundStartTimes = { "1": new Date().toISOString() } // Start round 1 immediately
    const solvedWords: SolvedWordsNew = {} // Initialize empty - no words solved yet
    const newResult = await prisma.gameResult.create({
      data: {
        gameId: puzzle.id,
        userId: userId || undefined,
        sessionId: userId ? undefined : sessionId || undefined,
        roundStartTimes,
        solvedWords,
      },
      include: {
        game: {
          include: {
            rounds: {
              include: { words: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        }
      }
    })
    return newResult
  }
  
  // Result exists but not completed - reuse it (failed game, allow retry)
  // Reset round start times and ensure round 1 is set
  const roundStartTimes = (result.roundStartTimes as Record<string, string> | null) || {}
  const solvedWords = (result.solvedWords as SolvedWords | null) || {}
  
  // Ensure solvedWords is initialized if missing
  if (!result.solvedWords) {
    await prisma.gameResult.update({
      where: { id: result.id },
      data: { solvedWords: {} as SolvedWordsNew }
    })
    result.solvedWords = {} as SolvedWordsNew
  }
  
  // Ensure round 1 start time is set if missing
  if (!roundStartTimes["1"]) {
    roundStartTimes["1"] = new Date().toISOString()
    await prisma.gameResult.update({
      where: { id: result.id },
      data: { roundStartTimes }
    })
    result.roundStartTimes = roundStartTimes
  }
  
  return result
}

/**
 * Submit answer for a word
 * Returns whether answer is correct and if round/game is complete
 */
export async function submitAnswerV2(opts: {
  gameId: string
  roundNumber: number
  wordIndex: number
  guess: string
  userId?: string | null
  sessionId?: string | null
}) {
  const { gameId, roundNumber, wordIndex, guess } = opts
  
  // Get game (only current round) and user's result
  const [game, result] = await Promise.all([
    prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        maxRounds: true
      }
    }),
    prisma.gameResult.findFirst({
      where: {
        gameId,
        OR: opts.userId ? [{ userId: opts.userId }] : [{ sessionId: opts.sessionId }]
      },
      select: {
        id: true,
        solvedWords: true,
        completedAt: true
      }
    })
  ])
  
  if (!game || !result) throw new Error('Game or result not found')
  
  // Fetch only the current round with words
  const round = await prisma.gameRound.findFirst({
    where: {
      gameId,
      roundNumber
    },
    include: { words: true }
  })
  
  if (!round) throw new Error('Round not found')
  
  const word = round.words.find(w => w.index === wordIndex)
  if (!word) throw new Error('Word not found')
  
  // Get user's solved words
  const solvedWords = (result.solvedWords as SolvedWords | null) || {}
  const roundKey = String(roundNumber)
  const solvedIndices = getSolvedIndices(solvedWords, roundKey)
  
  // Check if word already solved
  if (solvedIndices.includes(wordIndex)) {
    return { isCorrect: false, message: 'Word already solved' }
  }
  
  // Check answer (case-insensitive, trimmed)
  const normalized = (s: string) => s.trim().toLowerCase()
  const isCorrect = normalized(guess) === normalized(word.solution)
  
  if (!isCorrect) {
    await prisma.roundWord.update({
      where: { id: word.id },
      data: { attempts: { increment: 1 } }
    })
    return { isCorrect: false, message: 'Nope! Try again.' }
  }
  
  // Correct answer - update user's solvedWords with timestamp
  const solvedAt = new Date().toISOString()
  const existingEntries = getSolvedEntries(solvedWords, roundKey)
  const newEntry: SolvedWordEntry = { index: wordIndex, solvedAt }
  const updatedRoundEntries = [...existingEntries, newEntry].sort((a, b) => a.index - b.index)
  
  const updatedSolvedWords: SolvedWordsNew = {
    ...(isNewFormat(solvedWords) ? solvedWords : {}),
    [roundKey]: updatedRoundEntries
  }
  
  await prisma.gameResult.update({
    where: { id: result.id },
    data: { solvedWords: updatedSolvedWords }
  })
  
  // Check if round is complete (all words in this round solved)
  const allWordsSolved = round.words.length === updatedRoundEntries.length
  
  if (!allWordsSolved) {
    return { isCorrect: true, roundComplete: false }
  }
  
  // Round complete - check if game is complete
  // Only fetch all rounds when needed (when current round is complete)
  const allRounds = await prisma.gameRound.findMany({
    where: { gameId },
    include: { words: true },
    orderBy: { roundNumber: 'asc' }
  })
  const allRoundsComplete = allRounds.every(r => {
    const rKey = String(r.roundNumber)
    const solved = getSolvedIndices(updatedSolvedWords, rKey)
    return solved.length === r.words.length
  })
  
  if (allRoundsComplete) {
    // Game complete
    await prisma.gameResult.update({
      where: { id: result.id },
      data: { completedAt: new Date() }
    })
    return { isCorrect: true, roundComplete: true, gameComplete: true }
  }
  
  return { isCorrect: true, roundComplete: true, gameComplete: false }
}

/**
 * Start next round (set round start time)
 * This is called when user completes a round and moves to the next one
 */
export async function startNextRoundV2(opts: {
  gameId: string
  roundNumber: number
  userId?: string | null
  sessionId?: string | null
}) {
  const { gameId, roundNumber } = opts
  
  const result = await prisma.gameResult.findFirst({
    where: {
      gameId,
      OR: opts.userId ? [{ userId: opts.userId }] : [{ sessionId: opts.sessionId }]
    }
  })
  
  if (!result) throw new Error('GameResult not found')
  
  const roundStartTimes = (result.roundStartTimes as Record<string, string> | null) || {}
  const roundKey = String(roundNumber)
  
  // Only set if not already set
  if (!roundStartTimes[roundKey]) {
    roundStartTimes[roundKey] = new Date().toISOString()
    await prisma.gameResult.update({
      where: { id: result.id },
      data: { roundStartTimes }
    })
  }
  
  return { ok: true }
}

/**
 * Mark game as failed (on death or tab close)
 * Note: We don't set completedAt for failures - only for successful completions
 * This allows users to start a new game for testing
 */
export async function markGameFailedV2(opts: {
  gameId: string
  userId?: string | null
  sessionId?: string | null
}) {
  const result = await prisma.gameResult.findFirst({
    where: {
      gameId: opts.gameId,
      OR: opts.userId ? [{ userId: opts.userId }] : [{ sessionId: opts.sessionId }]
    }
  })
  
  if (!result) return { ok: false }
  
  // Don't mark as failed if already completed successfully
  // For failures, we just leave completedAt as null
  // This allows users to start a new game for the same day (useful for testing)
  // In production, you might want to track failures differently
  
  return { ok: true }
}


/**
 * Core game logic for Anagram Battle Royale
 */

export interface AnagramConfig {
  length: number
  timeSeconds: number
}

export interface GameConfig {
  initialTimeSeconds: number
  timeDecreasePerRound: number
  initialAnagramLength: number
  lengthIncreasePerRound: number
  maxRounds: number
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  initialTimeSeconds: 60,
  timeDecreasePerRound: 5,
  initialAnagramLength: 5, // Start at 5 letters (Gradual config)
  lengthIncreasePerRound: 1,
  maxRounds: 4, // Only 4 rounds
}

// Game timing constants
export const QUEUE_OPEN_MINUTES_BEFORE = 15 // Queue opens 15 minutes before game
export const RECONNECTION_WINDOW_SECONDS = 20 // 20 seconds to reconnect
export const SUBMISSION_RATE_LIMIT_MS = 1000 // 1 submission per second max
export const MIN_GAMES_FOR_RANKING = 5 // Minimum games to be ranked
export const ROUND_COUNTDOWN_SECONDS = 15 // 15 second countdown between rounds

// Anonymous player constants
export const ANONYMOUS_RESULT_EXPIRY_DAYS = 1 // Anonymous results expire after 1 day
export const SESSION_ID_PREFIX = 'anon_' // Prefix for anonymous session IDs

/**
 * Calculate the configuration for a specific round
 */
export function getRoundConfig(round: number, config: GameConfig = DEFAULT_GAME_CONFIG): AnagramConfig {
  const length = config.initialAnagramLength + (round - 1) * config.lengthIncreasePerRound
  const timeSeconds = Math.max(
    15, // Minimum 15 seconds (Gradual config - gives players enough time)
    config.initialTimeSeconds - (round - 1) * config.timeDecreasePerRound
  )
  
  return { length, timeSeconds }
}

/**
 * Generate a random anagram of specified length
 * Picks a real word from the word list and shuffles it
 */
export function generateAnagram(length: number): { anagram: string; solution: string } {
  // Import here to avoid circular dependencies
  const { getRandomWord } = require('./words')
  
  // Get a random word of the specified length
  const solution = getRandomWord(length)
  
  // Shuffle it to create the anagram
  const anagram = shuffleString(solution)
  
  return { anagram, solution }
}

/**
 * Shuffle a string to create an anagram
 */
export function shuffleString(str: string): string {
  const arr = str.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

/**
 * Check if a solution is valid for an anagram
 * This checks if the solution uses the same letters as the anagram
 */
export function isValidAnagramSolution(anagram: string, solution: string): boolean {
  const normalize = (str: string) => str.toLowerCase().replace(/\s/g, '').split('').sort().join('')
  return normalize(anagram) === normalize(solution)
}

/**
 * Check if a word exists in our word list
 * Re-exported from words.ts for convenience
 */
export function isValidWord(word: string): boolean {
  // Import here to avoid circular dependencies
  const { isValidWord: checkWord } = require('./words')
  return checkWord(word)
}

/**
 * Validate a solution: must be a valid word AND use the same letters as the anagram
 */
export function validateSolution(anagram: string, solution: string): boolean {
  if (!isValidWord(solution)) {
    return false
  }
  return isValidAnagramSolution(anagram, solution)
}

/**
 * Get UK timezone-aware date for game scheduling
 */
export function getUKTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
}

/**
 * Get next game time (morning or evening)
 */
export function getNextGameTime(type: 'MORNING' | 'EVENING'): Date {
  const ukTime = getUKTime()
  const gameTime = new Date(ukTime)
  
  if (type === 'MORNING') {
    gameTime.setHours(9, 0, 0, 0) // 9 AM UK time
  } else {
    gameTime.setHours(20, 0, 0, 0) // 8 PM UK time
  }
  
  // If the time has already passed today, schedule for tomorrow
  if (gameTime <= ukTime) {
    gameTime.setDate(gameTime.getDate() + 1)
  }
  
  return gameTime
}

/**
 * Get when the queue opens for a game (15 minutes before scheduled time)
 */
export function getQueueOpenTime(scheduledTime: Date): Date {
  const queueTime = new Date(scheduledTime)
  queueTime.setMinutes(queueTime.getMinutes() - QUEUE_OPEN_MINUTES_BEFORE)
  return queueTime
}

/**
 * Check if a submission is within rate limit (1 per second)
 */
export function isWithinRateLimit(lastSubmissionTime: Date | null): boolean {
  if (!lastSubmissionTime) return true
  
  const now = new Date()
  const timeSinceLastSubmission = now.getTime() - lastSubmissionTime.getTime()
  return timeSinceLastSubmission >= SUBMISSION_RATE_LIMIT_MS
}

/**
 * Calculate world ranking score
 * Formula: (winRate * 0.4) + (avgRounds * 0.3) + (totalWins * 0.2) + (consistency * 0.1)
 */
export interface RankingStats {
  totalGames: number
  totalWins: number
  averageRoundsCompleted: number
  roundsCompletedHistory?: number[] // For consistency calculation
}

export function calculateWorldRankScore(stats: RankingStats): number {
  if (stats.totalGames < MIN_GAMES_FOR_RANKING) {
    return 0 // Not enough games to be ranked
  }
  
  // Win rate (0-100, normalized to 0-1)
  const winRate = stats.totalWins / stats.totalGames
  
  // Average rounds (normalized to 0-1, assuming max 10 rounds)
  const avgRoundsNormalized = Math.min(stats.averageRoundsCompleted / 10, 1)
  
  // Total wins (normalized using log scale, capped at reasonable max)
  // Assuming 100 wins is "perfect" score
  const totalWinsNormalized = Math.min(Math.log10(stats.totalWins + 1) / Math.log10(101), 1)
  
  // Consistency (lower variance = higher score)
  let consistency = 0.5 // Default if no history
  if (stats.roundsCompletedHistory && stats.roundsCompletedHistory.length > 1) {
    const mean = stats.averageRoundsCompleted
    const variance = stats.roundsCompletedHistory.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2)
    }, 0) / stats.roundsCompletedHistory.length
    const stdDev = Math.sqrt(variance)
    // Lower std dev = higher consistency (inverse relationship)
    // Normalize: std dev of 0 = 1.0, std dev of 5 = 0.0
    consistency = Math.max(0, 1 - (stdDev / 5))
  }
  
  // Weighted combination
  const score = (winRate * 0.4) + 
                (avgRoundsNormalized * 0.3) + 
                (totalWinsNormalized * 0.2) + 
                (consistency * 0.1)
  
  return score
}

/**
 * Check if player can reconnect (within 20 second window)
 */
export function canReconnect(disconnectedAt: Date, roundEndTime: Date | null): boolean {
  if (!roundEndTime) return true // Round hasn't ended yet
  
  const now = new Date()
  const timeSinceDisconnect = now.getTime() - disconnectedAt.getTime()
  const timeUntilRoundEnd = roundEndTime.getTime() - now.getTime()
  
  // Can reconnect if within window AND round hasn't ended
  return timeSinceDisconnect <= RECONNECTION_WINDOW_SECONDS * 1000 && timeUntilRoundEnd > 0
}

/**
 * Calculate when the next round should start (after countdown)
 */
export function getNextRoundStartTime(previousRoundEndTime: Date): Date {
  const nextRoundStart = new Date(previousRoundEndTime)
  nextRoundStart.setSeconds(nextRoundStart.getSeconds() + ROUND_COUNTDOWN_SECONDS)
  return nextRoundStart
}


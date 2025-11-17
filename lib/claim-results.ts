/**
 * Claim Anonymous Results
 * 
 * Automatically claims anonymous game results when a user registers
 */

import { prisma } from './db'
import { getStoredSessionId, clearSessionId } from './anonymous'

/**
 * Claim all anonymous results for a session ID and assign to new user
 * Called automatically when user registers
 */
export async function claimAnonymousResults(
  userId: string,
  sessionId: string
): Promise<number> {
  // Find all unclaimed anonymous results for this session
  const anonymousResults = await prisma.gameResult.findMany({
    where: {
      sessionId,
      isAnonymous: true,
      canBeClaimed: true,
      userId: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } } // Not expired
      ]
    },
    include: {
      game: true
    }
  })
  
  if (anonymousResults.length === 0) {
    return 0
  }
  
  // Update all results to be claimed by this user
  const updatePromises = anonymousResults.map(result =>
    prisma.gameResult.update({
      where: { id: result.id },
      data: {
        userId,
        sessionId: null, // Clear session ID
        isAnonymous: false,
        canBeClaimed: false,
        expiresAt: null
      }
    })
  )
  
  await Promise.all(updatePromises)
  
  // Update user stats based on claimed results
  await updateUserStatsFromClaimedResults(userId, anonymousResults)
  
  return anonymousResults.length
}

/**
 * Update user statistics based on claimed game results
 */
async function updateUserStatsFromClaimedResults(
  userId: string,
  results: Array<{
    roundsCompleted: number
    isWinner: boolean
    createdAt: Date
  }>
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalGames: true,
      totalWins: true,
      averageRoundsCompleted: true
    }
  })
  
  if (!user) return
  
  // Calculate new stats
  const newTotalGames = user.totalGames + results.length
  const newTotalWins = user.totalWins + results.filter(r => r.isWinner).length
  
  // Calculate new average rounds
  const totalRounds = results.reduce((sum, r) => sum + r.roundsCompleted, 0)
  const existingTotalRounds = user.averageRoundsCompleted * user.totalGames
  const newAverageRounds = (existingTotalRounds + totalRounds) / newTotalGames
  
  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalGames: newTotalGames,
      totalWins: newTotalWins,
      averageRoundsCompleted: newAverageRounds
    }
  })
}

/**
 * Claim results on user registration (automatic)
 * Gets session ID from localStorage and claims all results
 */
export async function claimResultsOnRegistration(userId: string): Promise<number> {
  const sessionId = getStoredSessionId()
  
  if (!sessionId) {
    return 0 // No session ID, nothing to claim
  }
  
  const claimedCount = await claimAnonymousResults(userId, sessionId)
  
  // Clear session ID after claiming
  if (claimedCount > 0) {
    clearSessionId()
  }
  
  return claimedCount
}

/**
 * Cleanup expired anonymous results (run as background job)
 */
export async function cleanupExpiredAnonymousResults(): Promise<number> {
  const now = new Date()
  
  const result = await prisma.gameResult.deleteMany({
    where: {
      isAnonymous: true,
      expiresAt: {
        lte: now // Expired
      }
    }
  })
  
  return result.count
}


/**
 * World Ranking System
 * 
 * Calculates player rankings based on multiple performance metrics
 */

import { prisma } from './db'
import { calculateWorldRankScore, MIN_GAMES_FOR_RANKING } from './game'

export interface UserRanking {
  userId: string
  score: number
  rank: number
}

/**
 * Recalculate world rankings for all eligible users
 * Should be run periodically (e.g., daily or after each game)
 */
export async function recalculateWorldRankings(): Promise<void> {
  // Get all users with minimum games played
  const users = await prisma.user.findMany({
    where: {
      totalGames: {
        gte: MIN_GAMES_FOR_RANKING
      }
    },
    include: {
      gameResults: {
        select: {
          roundsCompleted: true
        }
      }
    }
  })
  
  // Calculate scores for each user
  const rankings: UserRanking[] = users.map(user => {
    const roundsHistory = user.gameResults.map(gr => gr.roundsCompleted)
    
    const score = calculateWorldRankScore({
      totalGames: user.totalGames,
      totalWins: user.totalWins,
      averageRoundsCompleted: user.averageRoundsCompleted,
      roundsCompletedHistory: roundsHistory
    })
    
    return {
      userId: user.id,
      score,
      rank: 0 // Will be set after sorting
    }
  })
  
  // Sort by score (descending)
  rankings.sort((a, b) => b.score - a.score)
  
  // Assign ranks (handle ties)
  let currentRank = 1
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0 && rankings[i].score < rankings[i - 1].score) {
      currentRank = i + 1
    }
    rankings[i].rank = currentRank
  }
  
  // Update database in batch
  await Promise.all(
    rankings.map(ranking =>
      prisma.user.update({
        where: { id: ranking.userId },
        data: {
          worldRank: ranking.rank,
          worldRankUpdatedAt: new Date()
        }
      })
    )
  )
}

/**
 * Get ranking for a specific user
 */
export async function getUserRank(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { worldRank: true }
  })
  
  return user?.worldRank ?? null
}

/**
 * Get leaderboard (top N users)
 */
export async function getLeaderboard(limit: number = 100): Promise<Array<{
  rank: number
  userId: string
  username: string
  score: number
  totalWins: number
  totalGames: number
  averageRoundsCompleted: number
}>> {
  const users = await prisma.user.findMany({
    where: {
      worldRank: {
        not: null
      },
      totalGames: {
        gte: MIN_GAMES_FOR_RANKING
      }
    },
    orderBy: {
      worldRank: 'asc'
    },
    take: limit,
    select: {
      id: true,
      username: true,
      worldRank: true,
      totalWins: true,
      totalGames: true,
      averageRoundsCompleted: true
    }
  })
  
  return users.map(user => ({
    rank: user.worldRank!,
    userId: user.id,
    username: user.username || 'user',
    score: 0, // Would need to recalculate or store
    totalWins: user.totalWins,
    totalGames: user.totalGames,
    averageRoundsCompleted: user.averageRoundsCompleted
  }))
}


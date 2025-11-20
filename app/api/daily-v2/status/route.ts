export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const url = new URL(request.url)
    // Always get sessionId from URL, even when logged in (for finding anonymous games)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!userId && !sessionId) {
      return NextResponse.json({ 
        hasPlayed: false,
        completedAt: null,
        nextGameTime: null,
        secondsUntilNext: null
      })
    }
    
    // Get today's v2 puzzle (3 rounds, 3 words each)
    // Filter by maxRounds: 3 to ensure we only get v2 puzzles, not old v1 puzzles (4 rounds)
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    
    const puzzle = await prisma.game.findFirst({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
        maxRounds: 3, // Only v2 puzzles have 3 rounds
      }
    })
    
    if (!puzzle) {
      // No puzzle yet, next game is tomorrow at 00:00 GMT
      const nextGameTime = addDays(today, 1)
      const secondsUntilNext = Math.floor((nextGameTime.getTime() - new Date().getTime()) / 1000)
      return NextResponse.json({
        hasPlayed: false,
        completedAt: null,
        nextGameTime: nextGameTime.toISOString(),
        secondsUntilNext
      })
    }
    
    // Build OR conditions to check for both userId games and anonymous games with sessionId
    // This allows detecting completed games even if user just logged in and game hasn't been claimed yet
    const orConditions = []
    if (userId) {
      orConditions.push({ userId })
      // Also check for games with this sessionId that might have been claimed (edge case)
      if (sessionId) {
        orConditions.push({ sessionId, userId })
      }
    }
    if (sessionId) {
      // Check for anonymous games (not yet claimed)
      orConditions.push({ sessionId, userId: null })
    }
    
    // Check if user has played today's game (either completed or failed)
    // A user has "played" if they have ANY GameResult for today's puzzle created today
    const allResults = await prisma.gameResult.findMany({
      where: {
        gameId: puzzle.id,
        createdAt: { gte: today, lt: tomorrow }, // Only count GameResults created today
        OR: orConditions.length > 0 ? orConditions : undefined,
      },
      select: {
        id: true,
        completedAt: true,
        userId: true,
        sessionId: true,
        solvedWords: true
      }
    })
    
    // Find the completed game (if any) - this gives us the completion time
    const completedResult = allResults.find(r => r.completedAt !== null)
    
    // User has "played" if they have ANY GameResult (completed or failed)
    const hasPlayed = allResults.length > 0
    
    // Next game is tomorrow at 00:00 GMT
    const nextGameTime = addDays(today, 1)
    const secondsUntilNext = Math.floor((nextGameTime.getTime() - new Date().getTime()) / 1000)
    
    return NextResponse.json({
      hasPlayed,
      completedAt: completedResult?.completedAt?.toISOString() || null,
      nextGameTime: nextGameTime.toISOString(),
      secondsUntilNext
    })
  } catch (error) {
    console.error('Error in /api/daily-v2/status:', error)
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


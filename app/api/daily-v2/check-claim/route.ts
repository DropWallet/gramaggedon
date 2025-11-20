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
    const sessionId = url.searchParams.get('sessionId')
    
    if (!userId || !sessionId) {
      return NextResponse.json({ hasAnonymousGame: false })
    }
    
    // Get today's puzzle
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    
    const puzzle = await prisma.game.findFirst({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
        maxRounds: 3,
      }
    })
    
    if (!puzzle) {
      return NextResponse.json({ hasAnonymousGame: false })
    }
    
    // Check if there's an anonymous game with this sessionId created today
    const anonymousGame = await prisma.gameResult.findFirst({
      where: {
        gameId: puzzle.id,
        sessionId: sessionId,
        userId: null,
        createdAt: { gte: today, lt: tomorrow }, // Only today's games
      },
      select: {
        id: true,
        completedAt: true,
      }
    })
    
    // If user already has a completed game, don't show modal (no need to claim)
    if (userId) {
      const userGame = await prisma.gameResult.findFirst({
        where: {
          gameId: puzzle.id,
          userId: userId,
          completedAt: { not: null }, // Only completed games
        },
        select: {
          id: true,
        }
      })
      
      // If user already has a completed game, don't show modal
      if (userGame) {
        return NextResponse.json({ 
          hasAnonymousGame: false, // Don't show modal
          isCompleted: false 
        })
      }
    }
    
    return NextResponse.json({ 
      hasAnonymousGame: !!anonymousGame,
      isCompleted: anonymousGame?.completedAt !== null 
    })
  } catch (error) {
    console.error('Error checking for anonymous game:', error)
    return NextResponse.json({ hasAnonymousGame: false })
  }
}


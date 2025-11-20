export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as any
    const { sessionId } = body
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
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
      return NextResponse.json({ ok: true }) // No puzzle, nothing to delete
    }
    
    // Delete anonymous game results for this sessionId
    await prisma.gameResult.deleteMany({
      where: {
        gameId: puzzle.id,
        sessionId: sessionId,
        userId: null,
        createdAt: { gte: today, lt: tomorrow }
      }
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting anonymous game:', error)
    return NextResponse.json(
      { error: 'Failed to delete anonymous game' },
      { status: 500 }
    )
  }
}


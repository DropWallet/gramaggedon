import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay } from 'date-fns'

export async function GET() {
  try {
    // Find the earliest daily game (v2 games with maxRounds: 3)
    const firstGame = await prisma.game.findFirst({
      where: {
        maxRounds: 3, // Only v2 daily games
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      select: {
        scheduledAt: true,
      },
    })

    if (!firstGame) {
      // No games yet, today is game 1
      return NextResponse.json({ roundNumber: 1 })
    }

    // Calculate days since first game
    const firstDay = startOfDay(firstGame.scheduledAt)
    const today = startOfDay(new Date())
    const diffTime = today.getTime() - firstDay.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    // Game number = days since first game + 1 (today = 1 if today is first day)
    const roundNumber = diffDays + 1

    return NextResponse.json({ roundNumber })
  } catch (error) {
    console.error('Error fetching round number:', error)
    return NextResponse.json({ roundNumber: 1 }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { startGame } from '@/lib/game-engine'
import { getNextGameTime } from '@/lib/game-schedule'

/**
 * API endpoint to start a game
 * This is called by Vercel Cron at game start times (9 AM & 6 PM UK time)
 * 
 * Vercel Cron automatically adds an "Authorization" header with a bearer token
 * that matches the CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  try {
    // Check for Vercel Cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, verify the request is from Vercel Cron
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const result = await startGame()

    if (!result) {
      return NextResponse.json(
        { message: 'No players in queue to start game' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      message: 'Game started successfully',
      gameId: result.gameId,
      playerCount: result.playerCount,
    })
  } catch (error) {
    console.error('Error in game start endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check if it's time to start a game
 * Useful for manual testing or health checks
 */
export async function GET() {
  const nextGameTime = getNextGameTime()
  const now = new Date()
  const timeUntilGame = nextGameTime.getTime() - now.getTime()

  return NextResponse.json({
    nextGameTime: nextGameTime.toISOString(),
    timeUntilGameMs: timeUntilGame,
    shouldStartGame: timeUntilGame <= 0,
  })
}


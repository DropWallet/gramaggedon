import { NextResponse } from 'next/server'
import { startGame } from '@/lib/game-engine'

/**
 * Test endpoint to manually start a game
 * Only available in development mode or with TEST_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check if we're in development or have test secret
    const isDevelopment = process.env.NODE_ENV === 'development'
    const testSecret = process.env.TEST_SECRET
    const authHeader = request.headers.get('authorization')

    if (!isDevelopment && testSecret) {
      if (authHeader !== `Bearer ${testSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized - Test endpoints require TEST_SECRET in production' },
          { status: 401 }
        )
      }
    }

    const result = await startGame()

    if (!result) {
      return NextResponse.json(
        { 
          message: 'No players in queue to start game',
          hint: 'Join the queue first by calling /api/queue/join'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      message: 'Game started successfully',
      gameId: result.gameId,
      playerCount: result.playerCount,
      gameUrl: `/game`,
    })
  } catch (error) {
    console.error('Error in test game start endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to start game', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check test endpoint status
 */
export async function GET() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hasTestSecret = !!process.env.TEST_SECRET

  return NextResponse.json({
    available: isDevelopment || hasTestSecret,
    environment: process.env.NODE_ENV,
    hasTestSecret,
    message: isDevelopment 
      ? 'Test endpoints are available in development mode'
      : hasTestSecret 
        ? 'Test endpoints available with TEST_SECRET'
        : 'Test endpoints not available',
  })
}


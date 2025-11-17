import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Test endpoint to reset/clear test data
 * WARNING: This will delete all games, queues, and results!
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

    // Delete in order to respect foreign key constraints
    const deletedCounts = {
      submissionAttempts: await prisma.submissionAttempt.deleteMany({}),
      roundResults: await prisma.roundResult.deleteMany({}),
      gameAnagrams: await prisma.gameAnagram.deleteMany({}),
      gameResults: await prisma.gameResult.deleteMany({}),
      gameQueues: await prisma.gameQueue.deleteMany({}),
      games: await prisma.game.deleteMany({}),
    }

    return NextResponse.json({
      message: 'Test data reset successfully',
      deleted: deletedCounts,
      warning: 'All games, queues, and results have been deleted',
    })
  } catch (error) {
    console.error('Error in test reset endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to reset test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


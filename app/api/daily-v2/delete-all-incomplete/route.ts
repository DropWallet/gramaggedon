export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const body = await request.json().catch(() => ({})) as any
    const { sessionId } = body
    
    // Build OR conditions to delete games for both userId and sessionId
    // This handles cases where user played logged out, then logged in
    const orConditions = []
    if (userId) {
      orConditions.push({ userId })
    }
    if (sessionId) {
      orConditions.push({ sessionId, userId: null }) // Anonymous games
      // Also check for games with this sessionId that might have been claimed (edge case)
      if (userId) {
        orConditions.push({ sessionId, userId })
      }
    }
    
    // Delete all game results for this user/session (both completed and incomplete)
    await prisma.gameResult.deleteMany({
      where: {
        OR: orConditions.length > 0 ? orConditions : undefined
      }
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting incomplete games:', error)
    return NextResponse.json(
      { error: 'Failed to delete games' },
      { status: 500 }
    )
  }
}


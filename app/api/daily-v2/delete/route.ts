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
    const { gameId, sessionId } = body
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }
    
    // Delete the game result
    await prisma.gameResult.deleteMany({
      where: {
        gameId,
        OR: userId ? [{ userId }] : [{ sessionId }]
      }
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    )
  }
}


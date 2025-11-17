export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { startCurrentRoundNow } from '@/lib/game-engine'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as any
  const { gameId } = body
  if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
  const res = await startCurrentRoundNow(gameId)
  return NextResponse.json(res)
}

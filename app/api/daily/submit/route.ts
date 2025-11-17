export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { submitDailyAnswer } from '@/lib/game-engine'

export async function POST(request: Request) {
  const body = await request.json()
  const { gameId, roundNumber, answer } = body
  if (!gameId || !roundNumber || !answer) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const res = await submitDailyAnswer({ gameId, roundNumber, guess: answer })
  return NextResponse.json(res)
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDailyGameV2, getSolvedIndices } from '@/lib/game-engine-v2'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    
    const body = await request.json().catch(() => ({})) as any
    const sessionId = body?.sessionId ?? null
    
    const result = await getDailyGameV2(userId, sessionId)
    
    if (!result || !result.game) {
      throw new Error('Failed to get game result')
    }
    
    // Get user's solved words
    const solvedWords = result.solvedWords
    
    // Determine user's current round (first round with unsolved words)
    let currentRound = 1
    for (const round of result.game.rounds) {
      const roundKey = String(round.roundNumber)
      const solved = getSolvedIndices(solvedWords, roundKey)
      const hasUnsolved = solved.length < round.words.length
      if (hasUnsolved) {
        currentRound = round.roundNumber
        break
      }
    }
    
    // If all rounds complete, return completed state
    const allComplete = result.game.rounds.every(r => {
      const roundKey = String(r.roundNumber)
      const solved = getSolvedIndices(solvedWords, roundKey)
      return solved.length === r.words.length
    })
    
    // Auto-set round start time for current round if missing
    const roundStartTimes = (result.roundStartTimes as Record<string, string> | null) || {}
    const roundKey = String(currentRound)
    if (!roundStartTimes[roundKey] && !allComplete) {
      roundStartTimes[roundKey] = new Date().toISOString()
      await prisma.gameResult.update({
        where: { id: result.id },
        data: { roundStartTimes }
      })
      result.roundStartTimes = roundStartTimes
    }
    
    return NextResponse.json({
      id: result.id,
      completedAt: result.completedAt,
      roundStartTimes: result.roundStartTimes,
      solvedWords: result.solvedWords || {},
      currentRound,
      allComplete,
      game: {
        id: result.game.id,
        rounds: result.game.rounds.map(r => ({
          roundNumber: r.roundNumber,
          words: r.words
            .sort((a, b) => a.index - b.index)
            .map(w => ({
              index: w.index,
              anagram: w.anagram,
              solution: w.solution,
              attempts: w.attempts
            }))
        }))
      }
    })
  } catch (error) {
    console.error('Error in /api/daily-v2/start:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { 
        error: 'Failed to start game', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


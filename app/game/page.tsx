import { getCurrentUser } from '@/lib/session'
import { getActiveGameForPlayer } from '@/lib/game-engine'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'

export default async function GamePage() {
  const user = await getCurrentUser()
  const userId = user?.id || null

  // Get player's active game (for logged-in users)
  // Anonymous users will load their game client-side
  const gameResult = userId ? await getActiveGameForPlayer(userId, null) : null

  return <GameClient initialGameResult={gameResult} />
}


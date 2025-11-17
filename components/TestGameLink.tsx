'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface TestGameLinkProps {
  gameDate: string
  battleNumber: number
}

export default function TestGameLink({ gameDate, battleNumber }: TestGameLinkProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First, join the queue
      const { getOrCreateSessionId, storeSessionId } = await import('@/lib/anonymous')
      const sessionId = getOrCreateSessionId()
      storeSessionId(sessionId)

      const joinResponse = await fetch('/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      })

      if (!joinResponse.ok) {
        throw new Error('Failed to join queue')
      }

      // Wait a moment for the queue entry to be created
      await new Promise(resolve => setTimeout(resolve, 500))

      // Then start the game
      const startResponse = await fetch('/api/test/start-game', {
        method: 'POST',
        credentials: 'include',
      })

      if (!startResponse.ok) {
        const error = await startResponse.json()
        throw new Error(error.error || 'Failed to start game')
      }

      // Redirect to game
      router.push('/game')
    } catch (error) {
      console.error('Error starting test game:', error)
      alert(`Failed to start test game: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50"
      title="Click to start a test game"
    >
      <p>{gameDate}</p>
      <p className="mt-1">Battle—{battleNumber}</p>
    </button>
  )
}


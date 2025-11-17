'use client'

import { useEffect, useState } from 'react'

export default function QueueStatus() {
  const [playersWaiting, setPlayersWaiting] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Get session ID for anonymous users
        let url = '/api/queue/status'
        const { getStoredSessionId } = await import('@/lib/anonymous')
        const sessionId = getStoredSessionId()
        if (sessionId) {
          url += `?sessionId=${encodeURIComponent(sessionId)}`
        }

        const response = await fetch(url)
        const data = await response.json()
        if (response.ok) {
          setPlayersWaiting(data.playersWaiting || 0)
        }
      } catch (error) {
        console.error('Failed to fetch queue status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <p className="text-center text-black font-serif text-sm">
        Loading...
      </p>
    )
  }

  return (
    <p className="text-center text-black font-serif text-sm">
      Currently {playersWaiting} {playersWaiting === 1 ? 'player' : 'players'} waiting.
    </p>
  )
}


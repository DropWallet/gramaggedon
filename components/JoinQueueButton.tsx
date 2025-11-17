'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function JoinQueueButton() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)

  useEffect(() => {
    // Check if user is already in queue
    const checkQueueStatus = async () => {
      try {
        // Get session ID for anonymous users
        let url = '/api/queue/status'
        if (!session) {
          const { getStoredSessionId } = await import('@/lib/anonymous')
          const sessionId = getStoredSessionId()
          if (sessionId) {
            url += `?sessionId=${encodeURIComponent(sessionId)}`
          }
        }

        const response = await fetch(url)
        const data = await response.json()
        if (response.ok && data.isInQueue) {
          setIsInQueue(true)
          router.push('/queue')
        }
      } catch (error) {
        console.error('Failed to check queue status:', error)
      }
    }

    checkQueueStatus()
  }, [router, session])

  const handleJoinQueue = async () => {
    setIsLoading(true)
    try {
      // Get session ID for anonymous users
      let sessionId = null
      if (!session) {
        // Import dynamically to avoid SSR issues
        const { getOrCreateSessionId } = await import('@/lib/anonymous')
        sessionId = getOrCreateSessionId()
      }

      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store sessionId if it was generated on the server
        if (data.sessionId && !session) {
          const { storeSessionId } = await import('@/lib/anonymous')
          storeSessionId(data.sessionId)
        }
        // Set isInQueue to true before redirecting to prevent redirect loop
        setIsInQueue(true)
        // Redirect to queue page with a flag to skip initial check
        router.push('/queue?justJoined=true')
      } else {
        alert(data.error || 'Failed to join queue')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to join queue:', error)
      alert('Failed to join queue. Please try again.')
      setIsLoading(false)
    }
  }

  if (isInQueue) {
    return (
      <button
        onClick={() => router.push('/queue')}
        className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors shadow-lg"
      >
        View queue
      </button>
    )
  }

  return (
    <button
      onClick={handleJoinQueue}
      disabled={isLoading}
      className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Joining...' : 'Join next game'}
    </button>
  )
}


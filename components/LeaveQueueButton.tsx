'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function LeaveQueueButton() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleLeaveQueue = async () => {
    setIsLoading(true)
    try {
      // Get session ID for anonymous users
      let sessionId = null
      if (!session) {
        const { getStoredSessionId } = await import('@/lib/anonymous')
        sessionId = getStoredSessionId()
      }

      const response = await fetch('/api/queue/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to home page
        router.push('/')
      } else {
        alert(data.error || 'Failed to leave queue')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to leave queue:', error)
      alert('Failed to leave queue. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLeaveQueue}
      disabled={isLoading}
      className="block w-full bg-white/80 hover:bg-white text-gray-800 font-medium py-3 px-6 rounded-lg text-center transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Leaving...' : 'Leave queue'}
    </button>
  )
}


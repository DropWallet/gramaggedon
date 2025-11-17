'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GameTimer from '@/components/GameTimer'
import QueueStatus from '@/components/QueueStatus'
import LeaveQueueButton from '@/components/LeaveQueueButton'

interface QueuePageClientProps {
  nextGameTime: Date
}

export default function QueuePageClient({ nextGameTime }: QueuePageClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkQueueStatus = async () => {
      try {
        // Check if we just joined (from query param)
        const searchParams = new URLSearchParams(window.location.search)
        const justJoined = searchParams.get('justJoined') === 'true'
        
        // If we just joined, skip the initial check and verify after a delay
        if (justJoined) {
          // Remove the query param
          window.history.replaceState({}, '', '/queue')
          // Wait a bit for the database to be ready, then verify
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        // Get session ID for anonymous users
        let url = '/api/queue/status'
        if (!session) {
          const { getStoredSessionId } = await import('@/lib/anonymous')
          const sessionId = getStoredSessionId()
          if (sessionId) {
            url += `?sessionId=${encodeURIComponent(sessionId)}`
          }
        }

        // Add a small delay if we didn't just join
        if (!justJoined) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        const response = await fetch(url, {
          cache: 'no-store', // Don't cache to get fresh data
          credentials: 'include', // Include cookies for session
        })
        const data = await response.json()

        console.log('Queue status check result:', data)

        if (response.ok) {
          if (!data.isInQueue) {
            // Not in queue, but wait a bit longer and retry once more
            // This handles cases where the database transaction hasn't fully committed
            await new Promise(resolve => setTimeout(resolve, 500))
            const retryResponse = await fetch(url, {
              cache: 'no-store',
              credentials: 'include',
            })
            const retryData = await retryResponse.json()
            console.log('Queue status retry result:', retryData)
            
            if (retryResponse.ok && !retryData.isInQueue) {
              // Still not in queue after retry, redirect to home
              router.push('/')
              return
            }
          }
        } else {
          // If there's an error, don't redirect immediately - might be a temporary issue
          console.error('Queue status check failed:', data)
          // Retry once after a delay
          setTimeout(async () => {
            try {
              const retryResponse = await fetch(url, { cache: 'no-store' })
              const retryData = await retryResponse.json()
              if (retryResponse.ok && !retryData.isInQueue) {
                router.push('/')
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError)
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to check queue status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkQueueStatus()
  }, [router, session])

  if (isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-center text-black">Loading...</p>
      </div>
    )
  }

  return (
    <>
      {/* "You're in" Message */}
      <div className="text-center mb-6">
        <p className="text-green-500 font-semibold text-lg mb-2">You&apos;re in.</p>
        <p className="text-black font-sans text-sm">Next game starts in</p>
      </div>

      {/* Timer Widget */}
      <div className="mb-6 w-full">
        <GameTimer nextGameTime={nextGameTime} />
      </div>

      {/* Players Waiting */}
      <div className="w-full mb-6">
        <QueueStatus />
      </div>

      {/* Leave Queue Button */}
      <div className="w-full">
        <LeaveQueueButton />
      </div>
    </>
  )
}


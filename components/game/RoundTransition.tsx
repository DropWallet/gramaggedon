'use client'

import { useEffect, useState } from 'react'

interface RoundTransitionProps {
  nextRound: number
  countdownSeconds: number
  onCountdownComplete: () => void
  showSuccess?: boolean
  nextRoundStartTime?: Date | null
}

export default function RoundTransition({ nextRound, countdownSeconds, onCountdownComplete, showSuccess = false, nextRoundStartTime }: RoundTransitionProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)

  useEffect(() => {
    // Calculate time until next round starts
    // If nextRoundStartTime is provided, use it directly
    // Otherwise use a simple countdown
    const updateCountdown = () => {
      if (nextRoundStartTime) {
        const now = new Date()
        const nextRoundStart = new Date(nextRoundStartTime)
        const remaining = Math.max(0, Math.floor((nextRoundStart.getTime() - now.getTime()) / 1000))
        setTimeLeft(remaining)
        
        if (remaining <= 0) {
          onCountdownComplete()
        }
      } else {
        // Fallback to simple countdown from current value
        setTimeLeft(prev => {
          if (prev <= 1) {
            onCountdownComplete()
            return 0
          }
          return prev - 1
        })
      }
    }

    // Initialize countdown immediately if we have the start time
    if (nextRoundStartTime) {
      updateCountdown()
    }

    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, onCountdownComplete, nextRoundStartTime, countdownSeconds])

  return (
    <div className="home-shell scanlines">
      <main className="home-main flex flex-col !justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center gap-2">
            <p className="flex-grow-0 flex-shrink-0 text-body-large text-center text-[color:var(--color-accent-yellow)]">
              Nice work.
            </p>
            <p className="flex-grow-0 flex-shrink-0 text-body-large text-center text-[color:var(--color-accent-pink)]">
              Round {nextRound} starts in...
            </p>
          </div>
          <p className="flex-grow-0 flex-shrink-0 text-[100px] font-bold italic text-center text-[color:var(--color-accent-pink)]" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
            {String(timeLeft).padStart(2, '0')}
          </p>
        </div>
      </main>
    </div>
  )
}


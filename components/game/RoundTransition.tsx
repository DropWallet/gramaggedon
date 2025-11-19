'use client'

import { useEffect, useState } from 'react'
import ConfettiEffect from '@/components/ConfettiEffect'

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
    // Reset to initial countdown when component mounts or countdownSeconds changes
    setTimeLeft(countdownSeconds)
    
    // Simple countdown timer
    const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
          clearInterval(interval)
          // Call onCountdownComplete after a brief delay to ensure state is updated
          setTimeout(() => {
            onCountdownComplete()
          }, 0)
            return 0
          }
          return prev - 1
        })
    }, 1000)

    return () => clearInterval(interval)
  }, [countdownSeconds]) // Remove onCountdownComplete from deps to prevent restart

  return (
    <div className="home-shell scanlines">
      <ConfettiEffect duration={5000} />
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


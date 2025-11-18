'use client'

import { useEffect, useState } from 'react'
import { isFinalRound } from '@/lib/round-progression'

interface RoundTimerProps {
  anagram: {
    roundNumber: number
    timeSeconds: number
    roundStartedAt: Date | null
    roundEndedAt: Date | null
  }
  isFinalRound: boolean
}

export default function RoundTimer({ anagram, isFinalRound }: RoundTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (isFinalRound) {
      // Final round: show elapsed time
      const startTime = anagram.roundStartedAt ? new Date(anagram.roundStartedAt).getTime() : Date.now()
      
      const updateElapsed = () => {
        const now = Date.now()
        const elapsed = Math.max(0, Math.floor((now - startTime) / 1000))
        setElapsedTime(elapsed)
      }

      updateElapsed()
      const interval = setInterval(updateElapsed, 1000)

      return () => clearInterval(interval)
    } else if (anagram.roundEndedAt) {
      // Regular round with end time: show countdown
      const updateCountdown = () => {
        const now = Date.now()
        const endTime = new Date(anagram.roundEndedAt!).getTime()
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
        setTimeLeft(remaining)
      }

      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)

      return () => clearInterval(interval)
    } else {
      // Round hasn't started yet - show initial time
      setTimeLeft(anagram.timeSeconds)
    }
  }, [anagram, isFinalRound])

  return (
    <div className="game-timer-section">
      <div className="game-timer-display">
      {isFinalRound ? (
        <>
            <div className="game-timer-number">
            {String(elapsedTime).padStart(2, '0')}
          </div>
            <div className="text-body-small text-[color:var(--color-accent-pink)]" style={{ fontSize: '12px', letterSpacing: '-0.1em', fontWeight: 500 }}>seconds elapsed</div>
        </>
      ) : (
        <>
            <div className="game-timer-number">
            {String(timeLeft ?? anagram.timeSeconds ?? 0).padStart(2, '0')}
          </div>
            <div className="text-body-small text-[color:var(--color-accent-pink)]" style={{ fontSize: '12px', letterSpacing: '-0.1em', fontWeight: 500 }}>seconds remaining</div>
        </>
      )}
      </div>
    </div>
  )
}


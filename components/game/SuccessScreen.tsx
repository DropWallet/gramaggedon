'use client'

import { useEffect, useState } from 'react'

interface SuccessScreenProps {
  correctWord: string
  nextRound: number
  nextRoundStartTime: Date | null
  onComplete: () => void
}

export default function SuccessScreen({ correctWord, nextRound, nextRoundStartTime, onComplete }: SuccessScreenProps) {
  const [timeLeft, setTimeLeft] = useState<number>(15)

  useEffect(() => {
    if (!nextRoundStartTime) return

    const updateCountdown = () => {
      const now = new Date()
      const nextRoundStart = new Date(nextRoundStartTime)
      const remaining = Math.max(0, Math.floor((nextRoundStart.getTime() - now.getTime()) / 1000))
      setTimeLeft(remaining)
      
      if (remaining <= 0) {
        onComplete()
      }
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [nextRoundStartTime, onComplete])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 max-w-md mx-auto">
      <div className="text-center">
        {/* Timer at the top */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Round {nextRound} starting in...</h2>
          <div className="text-[64px] font-bold text-black font-serif leading-none">
            {String(timeLeft).padStart(2, '0')}
          </div>
        </div>

        {/* Success message */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-black mb-6">boom, nailed it.</h2>
          <div className="text-4xl font-bold font-serif">
            <span 
              className="bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 bg-[length:200%_auto] animate-[gradient_3s_ease_infinite] bg-clip-text text-transparent"
              style={{
                backgroundSize: '200% auto',
                animation: 'gradient 3s ease infinite',
              }}
            >
              {correctWord}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiEffectProps {
  duration?: number // Duration in milliseconds, default 5 seconds
}

export default function ConfettiEffect({ duration = 5000 }: ConfettiEffectProps) {
  useEffect(() => {
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 20, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 20 * (timeLeft / duration)

      // Left side confetti
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
      )

      // Right side confetti
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      )
    }, 250)

    return () => clearInterval(interval)
  }, [duration])

  return null
}


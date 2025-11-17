'use client'

import { useEffect, useState } from 'react'

interface GameTimerProps {
  nextGameTime: Date
}

export default function GameTimer({ nextGameTime }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = new Date(nextGameTime).getTime()
      const difference = target - now

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ hours, minutes, seconds })
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [nextGameTime])

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0')
  }

  return (
    <div className="w-full">
      <p className="text-center text-sm mb-2 font-sans font-bold text-black">Next game starts in</p>
      <div className="bg-white/80 backdrop-blur-sm border-2 border-black rounded-lg p-4">
        <div className="flex justify-center items-center gap-4 text-black">
          <div className="text-center flex-1">
            <div className="text-[64px] font-serif font-bold leading-none flex justify-center">
              {formatTime(timeLeft.hours)}
            </div>
            <div className="text-xs mt-1 font-serif font-bold">hours</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[64px] font-serif font-bold leading-none flex justify-center">
              {formatTime(timeLeft.minutes)}
            </div>
            <div className="text-xs mt-1 font-serif font-bold">minutes</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[64px] font-serif font-bold leading-none flex justify-center">
              {formatTime(timeLeft.seconds)}
            </div>
            <div className="text-xs mt-1 font-serif font-bold">seconds</div>
          </div>
        </div>
      </div>
    </div>
  )
}

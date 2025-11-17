'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TimerProps {
  initialSeconds: number
  onTimeUp: () => void
  className?: string
}

export default function Timer({ initialSeconds, onTimeUp, className }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  
  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp()
      return
    }
    
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [seconds, onTimeUp])
  
  const percentage = (seconds / initialSeconds) * 100
  const isLowTime = seconds <= 10
  
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="text-4xl font-bold mb-2">
        <span className={cn(isLowTime && 'text-red-600 animate-pulse')}>
          {seconds}
        </span>
      </div>
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            isLowTime ? 'bg-red-600' : 'bg-green-600'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}


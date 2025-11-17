'use client'

import { useEffect, useRef } from 'react'

interface AnswerInputProps {
  answer: string
  setAnswer: (answer: string) => void
  maxLength: number
  onSubmit: () => void
}

export default function AnswerInput({ answer, setAnswer, maxLength, onSubmit }: AnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previousAnswerRef = useRef<string>('')

  useEffect(() => {
    // Focus input on mount and when maxLength changes
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [maxLength])

  // Keep input focused - refocus on blur
  const handleBlur = () => {
    // Small delay to allow other interactions, then refocus
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Global keyboard listener to refocus when typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only refocus if it's a letter key and input is not already focused
      if (e.target !== inputRef.current && /^[a-zA-Z]$/.test(e.key)) {
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])
  
  // Handle click on boxes to focus input
  const handleBoxClick = () => {
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit()
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      setAnswer(answer.slice(0, -1))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z]/g, '')
    // Only update if the value is different (prevents issues with controlled input)
    if (value.length <= maxLength && value !== answer) {
      setAnswer(value)
    }
  }

  // Create boxes for each letter
  const boxes = Array.from({ length: maxLength }, (_, i) => {
    const letter = answer[i] || ''
    const previousLetter = previousAnswerRef.current[i] || ''
    
    // Track if this box just became filled (was empty, now has a letter)
    const justFilled = letter && !previousLetter
    
    return (
      <div
        key={i}
        className={`game-letter-box ${letter ? 'game-letter-box--filled' : 'game-letter-box--empty'} ${justFilled ? 'game-letter-box--animating' : ''}`}
      >
        {letter && (
          <p className="self-stretch flex-shrink-0 w-9 text-body-medium text-center text-black">
            {letter.toUpperCase()}
          </p>
        )}
      </div>
    )
  })
  
  // Update previous answer after render
  useEffect(() => {
    previousAnswerRef.current = answer
  }, [answer])

  return (
    <div 
      className="flex items-center justify-center gap-2 flex-shrink-0 relative cursor-text w-full"
      onClick={handleBoxClick}
      onFocus={handleBoxClick}
      tabIndex={0}
    >
      {/* Hidden input for keyboard input */}
      <input
        ref={inputRef}
        type="text"
        value={answer}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="sr-only"
        maxLength={maxLength}
        autoComplete="off"
        autoFocus
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'auto' }}
      />
      
      {/* Visual letter boxes */}
      {boxes}
    </div>
  )
}


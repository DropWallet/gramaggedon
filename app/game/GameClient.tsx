'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import RoundTimer from '@/components/game/RoundTimer'
import AnagramDisplay from '@/components/game/AnagramDisplay'
import AnswerInput from '@/components/game/AnswerInput'
import SubmitButton from '@/components/game/SubmitButton'
import RoundIndicator from '@/components/game/RoundIndicator'
import PlayerStatus from '@/components/game/PlayerStatus'
import RoundTransition from '@/components/game/RoundTransition'
import ErrorBanner from '@/components/game/ErrorBanner'
import SuccessBanner from '@/components/game/SuccessBanner'
import LoadingSpinner from '@/components/LoadingSpinner'
import SuccessScreen from '@/components/game/SuccessScreen'
import VictoryScreen from '@/components/game/VictoryScreen'
import DeathScreen from '@/components/game/DeathScreen'
import Link from 'next/link'

interface GameClientProps {
  initialGameResult: {
    id: string
    game: {
      id: string
      currentRound: number
      status: string
      maxRounds: number
      anagrams: Array<{
        id: string
        roundNumber: number
        anagram: string
        solution: string
        timeSeconds: number
        roundStartedAt: Date | null
        roundEndedAt: Date | null
      }>
    }
    roundResults: Array<{
      id: string
      roundNumber: number
      isEliminated: boolean
      totalAttempts: number
      correctAttempts: number
    }>
    isWinner: boolean
    totalPlayers?: number
    remainingPlayers?: number
  } | null
}

export default function GameClient({ initialGameResult }: GameClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  // Ensure submissionAttempts are included in initial state
  const [gameResult, setGameResult] = useState(
    initialGameResult ? {
      ...initialGameResult,
      submissionAttempts: (initialGameResult as any).submissionAttempts || [],
    } : null
  )
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(!initialGameResult)
  const [showRoundTransition, setShowRoundTransition] = useState(false)
  const [nextRoundNumber, setNextRoundNumber] = useState(1)
  const [showSuccessTransition, setShowSuccessTransition] = useState(false)
  const [isLoadingNextRound, setIsLoadingNextRound] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [correctWord, setCorrectWord] = useState('')
  const [nextRoundStartTime, setNextRoundStartTime] = useState<Date | null>(null)
  const [isWinner, setIsWinner] = useState(false)
  const [isEliminated, setIsEliminated] = useState(false)
  const [lockedRoundNumber, setLockedRoundNumber] = useState<number | null>(null)
  const [inputWidth, setInputWidth] = useState<number>(220)
  const [isLoadingSuccessScreen, setIsLoadingSuccessScreen] = useState(false)

  // Debug: Always set up keyboard listener on mount
  useEffect(() => {
    console.log('GameClient mounted, setting up ArrowUp listener')
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        console.log('ArrowUp key detected!')
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Get current state values
        const currentGameResult = gameResult
        const currentShowRoundTransition = showRoundTransition
        const currentIsSubmitting = isSubmitting
        const currentSession = session
        
        console.log('State check:', {
          gameResult: !!currentGameResult,
          showRoundTransition: currentShowRoundTransition,
          isSubmitting: currentIsSubmitting,
          target: e.target
        })
        
        if (currentGameResult && !currentShowRoundTransition && !currentIsSubmitting) {
          console.log('Conditions met, completing round...')
          
          // Get current anagram
          const currentRound = currentGameResult.game.currentRound
          const roundAnagrams = currentGameResult.game.anagrams.filter((a: any) => a.roundNumber === currentRound)
          const roundResult = currentGameResult.roundResults.find((r: any) => r.roundNumber === currentRound)
          const correctCount = roundResult?.correctAttempts || 0
          const currentAnagram = roundAnagrams[correctCount]
          
          console.log('Round info:', { currentRound, roundAnagrams: roundAnagrams.length, correctCount, currentAnagram: !!currentAnagram })
          
          if (!currentAnagram) {
            console.log('No current anagram found')
            return
          }
          
          // Get session ID for anonymous users
          let sessionId = null
          if (!currentSession) {
            const { getStoredSessionId } = await import('@/lib/anonymous')
            sessionId = getStoredSessionId()
          }
          
          setIsSubmitting(true)
          try {
            const currentIndex = roundAnagrams.findIndex((a: any) => a.id === currentAnagram.id)
            console.log('Submitting round completion, starting at index:', currentIndex)
            
            // Submit current word first
            let response = await fetch('/api/game/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                answer: currentAnagram.solution,
                sessionId,
              }),
            })
            
            let data = await response.json()
            console.log('First submission result:', data)
            
            // If round not complete, submit remaining words
            if (data.isCorrect && !data.roundComplete) {
              for (let i = currentIndex + 1; i < roundAnagrams.length && i < 4; i++) {
                await new Promise(resolve => setTimeout(resolve, 200))
                response = await fetch('/api/game/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    answer: roundAnagrams[i].solution,
                    sessionId,
                  }),
                })
                data = await response.json()
                console.log(`Submission ${i + 1} result:`, data)
                if (data.roundComplete) break
              }
            }
            
            console.log('Round completion finished, refreshing...')
            router.refresh()
          } catch (error) {
            console.error('Error completing round:', error)
          } finally {
            setIsSubmitting(false)
          }
        } else {
          console.log('Conditions not met - skipping round completion')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress, true)
    return () => {
      console.log('Removing ArrowUp listener')
      window.removeEventListener('keydown', handleKeyPress, true)
    }
  }, [gameResult, showRoundTransition, isSubmitting, session, router])

  // Load game for anonymous users or refresh game data
  useEffect(() => {
    const loadGame = async () => {
      if (!gameResult) {
        try {
          let url = '/api/game/data'
          if (!session) {
            const { getStoredSessionId } = await import('@/lib/anonymous')
            const sessionId = getStoredSessionId()
            if (sessionId) {
              url += `?sessionId=${encodeURIComponent(sessionId)}`
            } else {
              router.push('/')
              return
            }
          }

          const response = await fetch(url, { credentials: 'include' })
          const data = await response.json()

          if (response.ok && data) {
            // Convert ISO strings back to Date objects
            const formattedData = {
              ...data,
              game: {
                ...data.game,
                anagrams: data.game.anagrams.map((a: any) => ({
                  ...a,
                  roundStartedAt: a.roundStartedAt ? new Date(a.roundStartedAt) : null,
                  roundEndedAt: a.roundEndedAt ? new Date(a.roundEndedAt) : null,
                })),
              },
              // Ensure submissionAttempts are preserved
              submissionAttempts: data.submissionAttempts || [],
            }
            setGameResult(formattedData)
            // Lock the round number when game loads
            if (formattedData.game) {
              setLockedRoundNumber(formattedData.game.currentRound)
            }
          } else {
            router.push('/')
          }
        } catch (error) {
          console.error('Failed to load game:', error)
          router.push('/')
        }
      }
      setIsLoading(false)
    }

    loadGame()
  }, [session, gameResult, router])

  // Check if game ended, player won, or eliminated
  useEffect(() => {
    if (!gameResult) return

    // Don't check elimination while on success screen - wait for transition
    if (showSuccessScreen) return

    // Check if player is winner (round 4 win)
    if (gameResult.isWinner) {
      setIsWinner(true)
      return
    }

    // Check if player is eliminated (timer ran out)
    // Check all round results to see if player was eliminated in any round
    const eliminatedRoundResult = gameResult.roundResults?.find(
      (rr: any) => rr.isEliminated && rr.correctAttempts === 0
    )
    if (eliminatedRoundResult && !gameResult.isWinner) {
      setIsEliminated(true)
      return
    }
    
    // Also check if current round has ended and player didn't solve it
    // This catches cases where elimination hasn't been processed yet
    const currentRound = gameResult.game.currentRound
    const currentRoundAnagram = gameResult.game.anagrams.find((a: any) => a.roundNumber === currentRound)
    const currentRoundResult = gameResult.roundResults?.find((rr: any) => rr.roundNumber === currentRound)
    
    if (currentRoundAnagram && currentRoundResult && !gameResult.isWinner && !isEliminated) {
      const now = new Date()
      const roundEnd = currentRoundAnagram.roundEndedAt ? new Date(currentRoundAnagram.roundEndedAt) : null
      const isFinal = currentRound >= gameResult.game.maxRounds
      
      // For non-final rounds, if round has ended and player didn't solve, they're eliminated
      // Check if round has ended regardless of isEliminated flag (might not be set yet)
      if (!isFinal && roundEnd && now >= roundEnd && currentRoundResult.correctAttempts === 0) {
        setIsEliminated(true)
        return
      }
    }

    // Check if game completed (but not winner/eliminated - shouldn't happen but handle it)
    if (gameResult.game.status === 'COMPLETED' && !gameResult.isWinner && !currentRoundResult?.isEliminated) {
      // Game ended for other reasons
      router.push('/game/result')
    }
  }, [gameResult, router, showSuccessScreen])

  // Keyboard shortcut: Press "1" to advance round (testing only)
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      // Don't trigger "1" if typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // "1" key: End the current round and advance to the next
      if (e.key === '1' && gameResult && !showRoundTransition && !isSubmitting) {
        e.preventDefault()
        
        try {
          // End the current round and advance to the next (end-round already processes and advances)
          const response = await fetch('/api/test/end-round', {
            method: 'POST',
            credentials: 'include',
          })

          if (response.ok) {
            // Refresh game data to show the new round
            router.refresh()
          } else {
            const error = await response.json()
            console.error('Failed to end/advance round:', error.error || 'Unknown error')
          }
        } catch (error) {
          console.error('Error ending/advancing round:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameResult, showRoundTransition, router, isSubmitting])

  // Poll for game updates and automatically process round endings
  useEffect(() => {
    if (!gameResult) return

    const pollInterval = setInterval(async () => {
      try {
        // First, check if round should end and process it automatically
        await fetch('/api/cron/round-processor', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => {
          // Ignore errors - might not be available in all environments
        })

        // Then fetch updated game data
        let url = '/api/game/data'
        if (!session) {
          const { getStoredSessionId } = await import('@/lib/anonymous')
          const sessionId = getStoredSessionId()
          if (sessionId) {
            url += `?sessionId=${encodeURIComponent(sessionId)}`
          } else {
            // No session ID, skip this poll
            return
          }
        }

        const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const formattedData = {
            ...data,
            game: {
              ...data.game,
              anagrams: data.game.anagrams.map((a: any) => ({
                ...a,
                roundStartedAt: a.roundStartedAt ? new Date(a.roundStartedAt) : null,
                roundEndedAt: a.roundEndedAt ? new Date(a.roundEndedAt) : null,
              })),
            },
          }
          
          // Only update game result if round hasn't changed (to prevent anagram from changing mid-round)
          // If lockedRoundNumber is set, only update if the round matches or if we're transitioning
          if (lockedRoundNumber === null || formattedData.game.currentRound === lockedRoundNumber || showSuccessScreen || isLoadingNextRound) {
            setGameResult(formattedData)
            // Update locked round number when round changes (during transitions)
            if (formattedData.game.currentRound !== lockedRoundNumber && (showSuccessScreen || isLoadingNextRound)) {
              setLockedRoundNumber(formattedData.game.currentRound)
            }
          }
          
          // Check if player was eliminated in any round
          // Only check if we're not on the success screen (to avoid false positives)
          if (!showSuccessScreen && !isEliminated && !isWinner) {
            const eliminatedRoundResult = formattedData.roundResults?.find(
              (rr: any) => rr.isEliminated && rr.correctAttempts === 0
            )
            if (eliminatedRoundResult) {
              setIsEliminated(true)
            } else {
              // Also check if current round has ended and player didn't solve
              const currentRound = formattedData.game.currentRound
              const currentRoundAnagram = formattedData.game.anagrams.find((a: any) => a.roundNumber === currentRound)
              const currentRoundResult = formattedData.roundResults?.find((rr: any) => rr.roundNumber === currentRound)
              
              if (currentRoundAnagram && currentRoundResult) {
                const now = new Date()
                const roundEnd = currentRoundAnagram.roundEndedAt ? new Date(currentRoundAnagram.roundEndedAt) : null
                const isFinal = currentRound >= formattedData.game.maxRounds
                
                // For non-final rounds, if round has ended and player didn't solve, they're eliminated
                // Check if round has ended regardless of isEliminated flag (might not be set yet)
                if (!isFinal && roundEnd && now >= roundEnd && currentRoundResult.correctAttempts === 0) {
                  setIsEliminated(true)
                }
              }
            }
          }
        } else if (response.status === 404) {
          // Game not found - might have ended or been reset
          // If we're on success screen, clear it and let the component handle the state
          if (showSuccessScreen) {
            console.log('Game not found during polling (404) - clearing success screen')
            setShowSuccessScreen(false)
            setCorrectWord('')
          }
          
          // Before stopping, check last known game state for elimination
          // This catches cases where the timer ran out and the game ended
          if (gameResult && !isEliminated && !isWinner) {
            // Check if player was eliminated in any round
            const eliminatedRoundResult = gameResult.roundResults?.find(
              (rr: any) => rr.isEliminated && rr.correctAttempts === 0
            )
            if (eliminatedRoundResult) {
              setIsEliminated(true)
            } else {
              // Also check if current round has ended and player didn't solve
              const currentRound = gameResult.game.currentRound
              const currentRoundAnagram = gameResult.game.anagrams.find((a: any) => a.roundNumber === currentRound)
              const currentRoundResult = gameResult.roundResults?.find((rr: any) => rr.roundNumber === currentRound)
              
              if (currentRoundAnagram && currentRoundResult) {
                const now = new Date()
                const roundEnd = currentRoundAnagram.roundEndedAt ? new Date(currentRoundAnagram.roundEndedAt) : null
                const isFinal = currentRound >= gameResult.game.maxRounds
                
                // For non-final rounds, if round has ended and player didn't solve, they're eliminated
                if (!isFinal && roundEnd && now >= roundEnd && currentRoundResult.correctAttempts === 0) {
                  setIsEliminated(true)
                }
              }
            }
          }
          
          // Stop polling if we get 404 - game likely ended or doesn't exist
          console.log('Game not found during polling (404) - stopping poll')
          // Don't set gameResult to null immediately - might be transitioning
        }
      } catch (error) {
        console.error('Failed to poll game data:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [gameResult, session, showSuccessScreen])

  // Check if we're in a round transition (between rounds) - automatic from round end
  useEffect(() => {
    if (!gameResult) return

    const currentAnagram = gameResult.game.anagrams.find(
      a => a.roundNumber === gameResult.game.currentRound
    )

    if (currentAnagram) {
      const now = new Date()
      const roundStart = currentAnagram.roundStartedAt ? new Date(currentAnagram.roundStartedAt) : null
      
      // If round hasn't started yet, we're in a transition period between rounds
      if (roundStart && now < roundStart) {
        // Show success message if player solved the previous round correctly
        // Check the previous round's result
        const previousRound = gameResult.game.currentRound - 1
        const previousRoundResult = gameResult.roundResults.find(
          rr => rr.roundNumber === previousRound
        )
        const solvedPrevious = previousRoundResult && previousRoundResult.correctAttempts > 0 && !previousRoundResult.isEliminated
        
        if (solvedPrevious) {
          setShowSuccessTransition(true)
        }
        setShowRoundTransition(true)
        setNextRoundNumber(gameResult.game.currentRound)
      } else {
        // Round has started or is in progress - hide transition and clear feedback
        setShowRoundTransition(false)
        setShowSuccessTransition(false)
        setIsLoadingNextRound(false) // Hide loading spinner when round starts
        // Lock the round number when round starts to prevent anagram changes
        setLockedRoundNumber(gameResult.game.currentRound)
        // Clear feedback when a new round starts
        setLastFeedback(null)
      }
    }
  }, [gameResult, showRoundTransition])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    )
  }

  // Show loading spinner when preparing success screen
  if (isLoadingSuccessScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-gray-600">Preparing next round...</p>
        </div>
      </div>
    )
  }

  // Show loading spinner when transitioning to next round
  if (isLoadingNextRound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-gray-600">Starting next round...</p>
        </div>
      </div>
    )
  }

  if (!gameResult) {
    return null
  }

  const game = gameResult.game
  // Use locked round number if available, otherwise use current round from game
  // This prevents anagram from changing mid-round due to polling updates
  const displayRound = lockedRoundNumber !== null ? lockedRoundNumber : game.currentRound
  const currentAnagram = game.anagrams.find(a => a.roundNumber === displayRound)
  const currentRoundResult = gameResult.roundResults.find(rr => rr.roundNumber === displayRound)
  const totalPlayers = gameResult.totalPlayers || 0
  const remainingPlayers = gameResult.remainingPlayers || 0

  // Show winner screen (round 4 win)
  if (isWinner) {
    const victoryScreenData = gameResult ? {
      roundResults: gameResult.roundResults,
      game: {
        anagrams: gameResult.game.anagrams,
      },
      submissionAttempts: gameResult.submissionAttempts,
    } : null
    return <VictoryScreen gameResult={victoryScreenData} />
  }

  // Show death screen (eliminated/timer ran out)
  if (isEliminated) {
    // Get the correct word from the round where player was eliminated
    const eliminatedRoundResult = gameResult.roundResults?.find(
      (rr: any) => rr.isEliminated && rr.correctAttempts === 0
    )
    const eliminatedRoundNumber = eliminatedRoundResult?.roundNumber || displayRound
    const eliminatedAnagram = game.anagrams.find(a => a.roundNumber === eliminatedRoundNumber)
    const correctWord = eliminatedAnagram?.solution || currentAnagram?.solution || ''
    
    return <DeathScreen correctWord={correctWord} gameResult={gameResult} />
  }

  // Show success screen after correct answer (with timer)
  if (showSuccessScreen && correctWord) {
    // Calculate next round start time from current game state
    const currentRound = gameResult?.game.currentRound || 0
    const nextRoundNum = currentRound + 1
    const nextRoundAnagram = gameResult?.game.anagrams.find((a: any) => a.roundNumber === nextRoundNum)
    const calculatedNextRoundStartTime = nextRoundAnagram?.roundStartedAt 
      ? new Date(nextRoundAnagram.roundStartedAt) 
      : nextRoundStartTime
    
    return (
      <SuccessScreen
        correctWord={correctWord}
        nextRound={nextRoundNum}
        nextRoundStartTime={calculatedNextRoundStartTime}
        onComplete={() => {
          console.log('Success screen timer complete - transitioning')
          // Hide success screen and clear state
          setShowSuccessScreen(false)
          setCorrectWord('')
          setNextRoundStartTime(null)
          setIsLoadingNextRound(true)
          
          // Unlock round number to allow transition to next round
          setLockedRoundNumber(null)
          
          // Refresh to trigger re-render - polling will update game state
          router.refresh()
        }}
      />
    )
  }

  if (!currentAnagram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-gray-600">Loading round...</p>
        </div>
      </div>
    )
  }

  const isFinalRound = displayRound >= game.maxRounds
  const hasTimer = !isFinalRound && currentAnagram.timeSeconds > 0

  // Get difficulty info based on round number and letter count
  const getDifficultyInfo = (roundNumber: number, letterCount: number) => {
    const difficultyMap: Record<number, { name: string; expectedLetters: number }> = {
      1: { name: 'Easy', expectedLetters: 5 },
      2: { name: 'Medium', expectedLetters: 6 },
      3: { name: 'Hard', expectedLetters: 4 },
      4: { name: 'Expert', expectedLetters: 5 },
    }
    const difficulty = difficultyMap[roundNumber] || { name: 'Unknown', expectedLetters: letterCount }
    return `${difficulty.name} (${letterCount} letters)`
  }

  // Get current word number (1-4) based on correct attempts
  const currentWordNumber = (currentRoundResult?.correctAttempts || 0) + 1
  const totalWords = 4

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting) return

    setIsSubmitting(true)
    setLastFeedback(null)

    try {
      // Get session ID for anonymous users
      let sessionId = null
      if (!session) {
        const { getStoredSessionId } = await import('@/lib/anonymous')
        sessionId = getStoredSessionId()
      }

      const response = await fetch('/api/game/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          answer: answer.trim(),
          sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Only set feedback for incorrect answers (no green "Correct!" text)
        if (!data.isCorrect) {
          setLastFeedback({
            isCorrect: false,
            message: data.message,
          })
          setTimeout(() => setLastFeedback(null), 2500)
        }

        if (data.isCorrect) {
          // Show success banner
          setLastFeedback({
            isCorrect: true,
            message: "Fuckin' nailed it.",
          })
          setTimeout(() => setLastFeedback(null), 2500)
          
          // Clear answer on correct submission
          setAnswer('')
          
          // Show loading state while preparing success screen
          setIsLoadingSuccessScreen(true)
          
          // Store correct word for success screen
          if (data.correctWord) {
            setCorrectWord(data.correctWord)
          }
          
          // If final round (round 4) and correct, check if winner
          if (data.isFinalRound) {
            // Round 4: first to answer wins - API will have processed winner
            // Hide loading and check winner status after a brief delay
            setIsLoadingSuccessScreen(false)
            setTimeout(async () => {
              // Refresh game data to check winner status
              let url = '/api/game/data'
              if (!session) {
                const { getStoredSessionId } = await import('@/lib/anonymous')
                const sessionId = getStoredSessionId()
                if (sessionId) {
                  url += `?sessionId=${encodeURIComponent(sessionId)}`
                }
              }
              
              const dataResponse = await fetch(url, { credentials: 'include', cache: 'no-store' })
              if (dataResponse.ok) {
                const gameData = await dataResponse.json()
                if (gameData.isWinner) {
                  setIsWinner(true)
                }
              }
            }, 500)
          } else {
            // For non-final rounds, trigger round end first, then show success screen
            // This ensures the next round start time is calculated correctly
            fetch('/api/test/end-round', {
              method: 'POST',
              credentials: 'include',
            }).then(async () => {
              // Wait for round to end and next round to be set up
              await new Promise(resolve => setTimeout(resolve, 600))
              
              // Fetch updated game data to get next round start time
              let url = '/api/game/data'
              if (!session) {
                const { getStoredSessionId } = await import('@/lib/anonymous')
                const sessionId = getStoredSessionId()
                if (sessionId) {
                  url += `?sessionId=${encodeURIComponent(sessionId)}`
                }
              }
              
              const dataResponse = await fetch(url, { credentials: 'include', cache: 'no-store' })
              if (dataResponse.ok) {
                const gameData = await dataResponse.json()
                // Get the next round's start time (includes 15 seconds + leftover time)
                const nextRound = gameData.game.currentRound
                const nextRoundAnagram = gameData.game.anagrams.find((a: any) => a.roundNumber === nextRound)
                if (nextRoundAnagram?.roundStartedAt) {
                  setNextRoundStartTime(new Date(nextRoundAnagram.roundStartedAt))
                }
                
                // Update game result with new data
                const formattedData = {
                  ...gameData,
                  game: {
                    ...gameData.game,
                    anagrams: gameData.game.anagrams.map((a: any) => ({
                      ...a,
                      roundStartedAt: a.roundStartedAt ? new Date(a.roundStartedAt) : null,
                      roundEndedAt: a.roundEndedAt ? new Date(a.roundEndedAt) : null,
                    })),
                  },
                }
                setGameResult(formattedData)
              }
              
              // Hide loading and show success screen with timer
              setIsLoadingSuccessScreen(false)
              setShowSuccessScreen(true)
            }).catch(err => {
              console.error('Error ending round:', err)
              // Hide loading and still show success screen even if round end fails
              setIsLoadingSuccessScreen(false)
              setShowSuccessScreen(true)
            })
          }
        }
      } else {
        setLastFeedback({
          isCorrect: false,
          message: data.error || 'Failed to submit answer',
        })
        setTimeout(() => setLastFeedback(null), 2500)
      }
    } catch (error) {
      console.error('Submission error:', error)
      setIsLoadingSuccessScreen(false)
      setLastFeedback({
        isCorrect: false,
        message: 'Failed to submit. Please try again.',
      })
      setTimeout(() => setLastFeedback(null), 2500)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show round transition if needed (only for automatic round end, not from success screen)
  // Success screen now handles its own timer, so we only show this if not coming from success
  if (showRoundTransition && !showSuccessScreen) {
    // Use the current round's start time directly - this is when the next round will actually start
    // The roundStartedAt is already set correctly in the database (previous round end + 15 seconds)
    const nextRoundStartTime = currentAnagram?.roundStartedAt ? new Date(currentAnagram.roundStartedAt) : null
    
    return (
      <RoundTransition
        nextRound={nextRoundNumber}
        countdownSeconds={15}
        showSuccess={showSuccessTransition}
        nextRoundStartTime={nextRoundStartTime}
        onCountdownComplete={() => {
          // Clear transition states and show loading spinner
          setShowRoundTransition(false)
          setShowSuccessTransition(false)
          setLastFeedback(null)
          setIsLoadingNextRound(true)
          // Refresh to load next round
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main flex flex-col relative">
        {/* Success Banner - absolutely positioned, spans full width */}
        {lastFeedback && lastFeedback.isCorrect && (
          <SuccessBanner message={lastFeedback.message} />
        )}

        {/* Error Banner - absolutely positioned, spans full width */}
        {lastFeedback && !lastFeedback.isCorrect && (
          <ErrorBanner message={lastFeedback.message} />
        )}

        {/* Top section with round info and timer */}
        <div className="flex flex-col items-start self-stretch flex-grow-0 flex-shrink-0">
          {/* Round info row */}
          <div className="game-round-info">
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-yellow)]">
              ROUND {displayRound}
            </p>
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-pink)]">
              {getDifficultyInfo(displayRound, currentAnagram.anagram.length)}
            </p>
          </div>

          {/* Timer section */}
          <RoundTimer
            anagram={currentAnagram}
            isFinalRound={isFinalRound}
          />
        </div>

        {/* Game content */}
        <div className="flex flex-col items-center justify-center max-md:justify-start gap-8 max-md:gap-6 flex-1 self-stretch relative w-full max-w-[440px] mx-auto max-md:mt-[72px]">
          {/* Word count with checked dots */}
          <div className="game-word-count flex-grow-0 flex-shrink-0 relative">
            <p className="flex-grow-0 flex-shrink-0 text-info-small text-[color:var(--color-accent-pink)]">
              WORD {currentWordNumber} OF {totalWords}
            </p>
            <div className="flex items-start flex-grow-0 flex-shrink-0 gap-3">
              {Array.from({ length: totalWords }, (_, i) => {
                const isFilled = i < currentWordNumber - 1
                return (
                  <div
                    key={i}
                    className={`game-checked-dot ${isFilled ? 'game-checked-dot--filled' : 'game-checked-dot--empty'}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Anagram Display */}
          <AnagramDisplay anagram={currentAnagram.anagram} />

          {/* Answer Input and Submit Button */}
          <div className="flex flex-col items-center flex-grow-0 flex-shrink-0 gap-6 self-stretch">
            <AnswerInput
              answer={answer}
              setAnswer={setAnswer}
              maxLength={currentAnagram.anagram.length}
              onSubmit={handleSubmit}
              onWidthChange={setInputWidth}
            />

            {/* Submit Button - hide during transition */}
            {!showRoundTransition && (
              <SubmitButton
                onClick={handleSubmit}
                disabled={!answer.trim() || isSubmitting}
                isLoading={isSubmitting}
                fullWidth={false}
                width={inputWidth}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

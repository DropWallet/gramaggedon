'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import AnswerInput from '@/components/game/AnswerInput'
import SubmitButton from '@/components/game/SubmitButton'
import DeathScreen from '@/components/game/DeathScreen'
import VictoryScreen from '@/components/game/VictoryScreen'
import AnagramDisplay from '@/components/game/AnagramDisplay'
import SuccessBanner from '@/components/game/SuccessBanner'
import ErrorBanner from '@/components/game/ErrorBanner'
import ConfettiEffect from '@/components/ConfettiEffect'

export default function DailyPage() {
  return (
    <div className="min-h-screen">
      <DailyGameClient />
    </div>
  )
}

function DailyGameClient() {
  const [data, setData] = useState<any>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isDead, setIsDead] = useState(false)
  const [now, setNow] = useState<Date>(new Date())
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showInterim, setShowInterim] = useState(false)
  const [interimSeconds, setInterimSeconds] = useState(5)
  const [upcomingRound, setUpcomingRound] = useState<number | null>(null)
  const [isWinner, setIsWinner] = useState(false)
  const [deathWord, setDeathWord] = useState<string | null>(null) // Store the word that caused death
  const isLoadingRef = useRef(false)
  const [inputWidth, setInputWidth] = useState<number>(220) // Will be updated by AnswerInput
  const nextRoundDataRef = useRef<any>(null) // Preloaded data for next round (using ref to avoid closure issues)
  const pendingReloadRef = useRef<ReturnType<typeof setTimeout> | null>(null) // Track pending reloads to prevent multiple concurrent reloads
  const lastSuccessfulSubmissionRef = useRef<number>(0) // Track last successful submission time to prevent false death triggers

  // Debug: Complete the round when pressing UP arrow key
  useEffect(() => {
    console.log('DailyGameClient mounted, setting up ArrowUp listener')
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        console.log('ArrowUp key detected on daily page!')
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        const game = data?.game
        const currentRound = game?.rounds?.find((r: any) => r.roundNumber === game?.currentRound)
        const nextWord = currentRound?.words?.find((w: any) => !w.solvedAt)
        
        console.log('State check:', {
          hasData: !!data,
          hasGame: !!game,
          currentRound: game?.currentRound,
          hasNextWord: !!nextWord,
          submitting,
          showInterim
        })
        
        if (data && game && nextWord && !submitting && !showInterim) {
          console.log('Conditions met, completing round...')
          
          // Get all words for current round
          const roundWords = currentRound.words || []
          const currentIndex = roundWords.findIndex((w: any) => w.id === nextWord.id)
          
          console.log('Round info:', { 
            currentRound: game.currentRound, 
            roundWords: roundWords.length, 
            currentIndex 
          })
          
          setSubmitting(true)
          try {
            // Optimistically mark first word as solved to prevent flicker
            setData((prev: any) => {
              if (!prev) return prev
              const clone = JSON.parse(JSON.stringify(prev))
              const g = clone.game
              const r = g.rounds.find((rr: any) => rr.roundNumber === g.currentRound)
              if (r) {
                const w = r.words.find((ww: any) => !ww.solvedAt)
                if (w) w.solvedAt = new Date().toISOString()
              }
              return clone
            })
            
            // Submit current word first
            let response = await fetch('/api/daily/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                gameId: game.id, 
                roundNumber: game.currentRound, 
                answer: nextWord.solution 
              }),
            })
            
            let payload = await response.json()
            console.log('First submission result:', payload)
            
            // Optimistically mark remaining words as solved as we submit them
            if (payload.isCorrect && !payload.roundComplete) {
              for (let i = currentIndex + 1; i < roundWords.length && i < 4; i++) {
                // Optimistically mark word as solved
                setData((prev: any) => {
                  if (!prev) return prev
                  const clone = JSON.parse(JSON.stringify(prev))
                  const g = clone.game
                  const r = g.rounds.find((rr: any) => rr.roundNumber === g.currentRound)
                  if (r && r.words[i]) {
                    r.words[i].solvedAt = new Date().toISOString()
                  }
                  return clone
                })
                
                await new Promise(resolve => setTimeout(resolve, 200))
                response = await fetch('/api/daily/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    gameId: game.id, 
                    roundNumber: game.currentRound, 
                    answer: roundWords[i].solution 
                  }),
                })
                payload = await response.json()
                console.log(`Submission ${i + 1} result:`, payload)
                if (payload.roundComplete) break
              }
            }
            
            console.log('Round completion finished')
            
            // If round complete, show interim screen or victory
            if (payload.roundComplete) {
              if (payload.isGameComplete) {
                setIsWinner(true)
              } else {
                // Show interim screen before next round
                setUpcomingRound((game.currentRound || 1) + 1)
                setShowInterim(true)
                // Reload game data in background (don't update state yet to avoid flicker)
                const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
                fetch(`/api/daily/data${qs}`, { cache: 'no-store' }).then(res => {
                  if (res.ok) return res.json()
                }).then(updatedData => {
                  if (updatedData) {
                    // Only update data after interim screen is shown
                    setTimeout(() => setData(updatedData), 100)
                }})
              }
            } else {
              // Not round complete: reload to sync state and show next word
              const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
              const reloadRes = await fetch(`/api/daily/data${qs}`, { cache: 'no-store' })
              if (reloadRes.ok) {
                setData(await reloadRes.json())
              }
            }
          } catch (error) {
            console.error('Error completing round:', error)
          } finally {
            setSubmitting(false)
          }
        } else {
          console.log('Conditions not met - skipping round completion')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress, true)
    return () => {
      console.log('Removing ArrowUp listener from daily page')
      window.removeEventListener('keydown', handleKeyPress, true)
    }
  }, [data, submitting, showInterim, sessionId])

  useEffect(() => {
    // Anonymous session support
    (async () => {
      try {
        const mod = await import('@/lib/anonymous')
        const sid = mod.getOrCreateSessionId()
        setSessionId(sid)
      } catch {
        setSessionId(null)
      }
    })()
  }, [])

  async function start() {
    if (isLoadingRef.current) return false
    isLoadingRef.current = true
    
    try {
      const res = await fetch('/api/daily/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const payload = await res.json()
        setData(payload)
        setLoading(false)
        return true
      }
      return false
    } finally {
      isLoadingRef.current = false
    }
  }

  async function load() {
    if (isLoadingRef.current) {
      console.log('Load already in progress, skipping')
      return // Return early to prevent race conditions
    }
    isLoadingRef.current = true
    
    try {
      const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
      const res = await fetch(`/api/daily/data${qs}`, { cache: 'no-store' })
      if (res.ok) {
        const newData = await res.json()
        // Only update data if we got valid data back
        if (newData && newData.game) {
          setData(newData)
        }
      } else if (res.status === 404) {
        // 404 means no game found - this is expected for new games, don't clear data
        console.log('No daily game found (404) - this may be expected for new games')
        // Don't set data to null, keep existing data
      } else {
        // Other errors - log but don't clear data
        console.error('Error loading daily game data:', res.status)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error in load():', error)
      setLoading(false)
    } finally {
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    // Always start a fresh game - no resuming existing games
    // If user refreshes or leaves mid-game, they start fresh (which is fine for daily game)
    if (sessionId === undefined) return // Wait for sessionId to be set (null is valid)
    if (isLoadingRef.current) return // Already loading
    
    let cancelled = false
    let mounted = true
    
    ;(async () => {
      // Always call start() to create a fresh game
      await start()
      if (cancelled || !mounted) return
    })()
    
    return () => {
      cancelled = true
      mounted = false
    }
  }, [sessionId])

  // Tick timer every 500ms
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(t)
  }, [])

  // Cleanup pending reloads on unmount
  useEffect(() => {
    return () => {
      if (pendingReloadRef.current) {
        clearTimeout(pendingReloadRef.current)
        pendingReloadRef.current = null
      }
    }
  }, [])

  const game = data?.game
  const currentRound = game?.rounds?.find((r: any) => r.roundNumber === game?.currentRound)
  
  // Safety check: ensure currentRound matches game.currentRound (data might be stale)
  if (currentRound && game?.currentRound && currentRound.roundNumber !== game.currentRound) {
    console.error('Round mismatch detected:', {
      expectedRound: game.currentRound,
      actualRound: currentRound.roundNumber
    })
  }
  
  // Safely get next word and solved count, ensuring we have valid data
  // Only count solved words from the current round
  const nextWord = currentRound?.words?.find((w: any) => !w.solvedAt && w.anagram)
  const solvedCount = currentRound?.words?.filter((w: any) => w.solvedAt).length || 0
  
  // Safety check: if we don't have a valid nextWord but round exists, data might be stale
  if (!nextWord && currentRound && currentRound.words && currentRound.words.length > 0) {
    const allSolved = currentRound.words.every((w: any) => w.solvedAt)
    if (!allSolved) {
      // Data issue - log for debugging
      console.warn('No unsolved word found but round not complete - data may be stale', {
        roundNumber: game?.currentRound,
        words: currentRound.words.map((w: any) => ({ solvedAt: w.solvedAt, anagram: w.anagram?.substring(0, 5) }))
      })
    }
  }

  const remainingSeconds = useMemo(() => {
    if (!currentRound?.startedAt) return 120
    const start = new Date(currentRound.startedAt).getTime()
    const end = start + (currentRound.timeSeconds || 120) * 1000
    return Math.max(0, Math.ceil((end - now.getTime()) / 1000))
  }, [currentRound?.startedAt, currentRound?.timeSeconds, now])

  // Death condition: time up and not all words solved (ignore first 1s after (re)start and skip during interim)
  useEffect(() => {
    if (showInterim) return
    if (!currentRound?.startedAt) return
    if (submitting) return // Don't check death condition while submitting
    if (!data) return // Don't check if data is loading
    if (loading) return // Don't check while loading data
    if (isDead) return // Already dead, don't check again
    
    // Skip death check for 3 seconds after successful submission
    // This prevents false triggers when data is being reloaded after submission
    const timeSinceLastSuccess = Date.now() - lastSuccessfulSubmissionRef.current
    if (timeSinceLastSuccess < 3000) {
      return
    }
    
    const start = new Date(currentRound.startedAt).getTime()
    const timeSinceStart = Date.now() - start
    
    // Ignore first 1s after start to prevent false triggers
    if (timeSinceStart < 1000) return
    
    // Check if time has expired
    const roundDuration = (currentRound.timeSeconds || 120) * 1000
    const expectedEnd = start + roundDuration
    const currentTime = Date.now()
    
    // Trigger death if time has expired (with a small buffer to account for timing)
    if (currentTime >= expectedEnd) {
      const anyUnsolved = currentRound.words.some((w: any) => !w.solvedAt)
      if (anyUnsolved) {
        // Capture the first unsolved word at the moment of death
        const firstUnsolvedWord = currentRound.words.find((w: any) => !w.solvedAt && w.solution)
        const wordToShow = firstUnsolvedWord?.solution || ''
        
        console.log('Death condition triggered:', {
          currentTime,
          expectedEnd,
          timeSinceStart,
          roundDuration,
          anyUnsolved,
          deathWord: wordToShow,
          currentRoundNumber: game?.currentRound,
          roundWords: currentRound.words.map((w: any) => ({ 
            index: w.index, 
            solvedAt: w.solvedAt, 
            solution: w.solution?.substring(0, 5) 
          }))
        })
        
        setDeathWord(wordToShow) // Store the word that caused death
        setIsDead(true)
      }
    }
  }, [remainingSeconds, currentRound, showInterim, submitting, data, loading, isDead, now])

  // Interim countdown effect
  useEffect(() => {
    if (!showInterim) {
      // Clear nextRoundData when not in interim
      nextRoundDataRef.current = null
      return
    }
    
    setInterimSeconds(5)
    
    // Start loading the next round data immediately when interim screen shows
    if (data?.game?.id) {
      ;(async () => {
        try {
          const nextRes = await fetch('/api/daily/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: data.game.id }),
          })
          if (nextRes.ok) {
            const newData = await nextRes.json()
            if (newData?.game?.rounds) {
              const newRound = newData.game.rounds.find((r: any) => r.roundNumber === newData.game.currentRound)
              if (newRound && newRound.words && newRound.words.length > 0) {
                const allWordsValid = newRound.words.every((w: any) => w.anagram && w.anagram.length > 0)
                if (allWordsValid) {
                  // Store the preloaded data in ref (accessible in timer callback)
                  nextRoundDataRef.current = newData
                  console.log('Preloaded next round data:', { round: newData.game.currentRound, wordsCount: newRound.words.length })
                } else {
                  console.warn('Round words invalid from /api/daily/next')
                }
              } else {
                console.warn('Round data incomplete from /api/daily/next')
              }
            } else {
              console.warn('No rounds in response from /api/daily/next')
            }
          } else {
            console.error('Failed to preload next round:', nextRes.status)
            const errorText = await nextRes.text()
            console.error('Error details:', errorText)
          }
        } catch (error) {
          console.error('Error preloading next round:', error)
        }
      })()
    }
    
    const timer = setInterval(() => {
      setInterimSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer)
          setShowInterim(false)
          
          // If we have preloaded data, use it immediately (no flash!)
          if (nextRoundDataRef.current) {
            setData(nextRoundDataRef.current)
            nextRoundDataRef.current = null
            console.log('Swapped to preloaded round data')
          } else {
            // Fallback to loading if preload didn't complete in time
            console.warn('Preload not ready, falling back to load()')
            load()
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showInterim, data?.game?.id])

  async function submit() {
    if (!answer.trim() || submitting || !currentRound || !game) return
    setSubmitting(true)
    const res = await fetch('/api/daily/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id, roundNumber: currentRound.roundNumber, answer }),
    })
    const payload = await res.json()
    setSubmitting(false)

    if (payload.isCorrect) {
      // Track successful submission time to prevent false death triggers
      lastSuccessfulSubmissionRef.current = Date.now()
      
      setShowSuccess("Fuckin' nailed it.")
      setTimeout(() => setShowSuccess(null), 2500)
      // Optimistically advance current word
      setData((prev: any) => {
        if (!prev) return prev
        const clone = JSON.parse(JSON.stringify(prev))
        const g = clone.game
        const r = g.rounds.find((rr: any) => rr.roundNumber === g.currentRound)
        if (r) {
          const w = r.words.find((ww: any) => !ww.solvedAt)
          if (w) {
            w.solvedAt = new Date().toISOString()
            w.attempts = (w.attempts || 0) + 1
          }
        }
        return clone
      })

      // If round complete, show interim (5s) or victory
      if (payload.roundComplete) {
        if (payload.isGameComplete) {
          setIsWinner(true)
        } else {
          // Use server's nextRound, not client calculation (prevents round jumping)
          setUpcomingRound(payload.nextRound || (game.currentRound || 1) + 1)
          setShowInterim(true)
        }
      } else {
        // Not round complete: simple reload after delay to sync state
        // Clear any pending reload first
        if (pendingReloadRef.current) {
          clearTimeout(pendingReloadRef.current)
        }
        pendingReloadRef.current = setTimeout(async () => {
          const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
          const res = await fetch(`/api/daily/data${qs}`, { cache: 'no-store' })
          if (res.ok) {
            const newData = await res.json()
            if (newData && newData.game) {
              // Simple replace - don't try to merge (prevents sync issues)
              setData(newData)
            }
          }
          pendingReloadRef.current = null
        }, 800) // Increased delay to ensure DB commit
      }
    } else {
      // Wrong answer: keep current anagram and do not reload (prevents anagram change)
      setLastError("Guess again, cowboy.")
      setTimeout(() => setLastError(null), 2500)
    }

    setAnswer('')
  }

  // Early returns
  if (loading) return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main flex flex-col items-center !justify-center px-8">
        <span className="loader"></span>
      </main>
    </div>
  )
  if (!data) return <div className="min-h-screen flex items-center justify-center scanlines">No daily game</div>

  if (isDead) {
    // Use the stored death word (captured at moment of death) or fallback to nextWord
    const correctWord = deathWord || nextWord?.solution || ''
    // Convert daily game data to DeathScreen format
    const deathScreenData = data ? {
      game: {
        rounds: data.game.rounds.map((r: any) => ({
          roundNumber: r.roundNumber,
          startedAt: r.startedAt ? new Date(r.startedAt) : null,
          endedAt: r.endedAt ? new Date(r.endedAt) : null,
          words: r.words.map((w: any) => ({
            solvedAt: w.solvedAt ? new Date(w.solvedAt) : null,
          })),
        })),
      },
    } : null
    return <DeathScreen correctWord={correctWord} gameResult={deathScreenData} />
  }

  if (isWinner) {
    const victoryScreenData = data ? {
      game: {
        rounds: data.game.rounds.map((r: any) => ({
          roundNumber: r.roundNumber,
          startedAt: r.startedAt ? new Date(r.startedAt) : null,
          endedAt: r.endedAt ? new Date(r.endedAt) : null,
          words: r.words.map((w: any) => ({
            solvedAt: w.solvedAt ? new Date(w.solvedAt) : null,
          })),
        })),
      },
    } : null
    return <VictoryScreen gameResult={victoryScreenData} />
  }

  if (showInterim) {
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
                Round {upcomingRound ?? ''} starts in...
              </p>
            </div>
            <p className="flex-grow-0 flex-shrink-0 text-[100px] font-bold italic text-center text-[color:var(--color-accent-pink)]" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
              {String(interimSeconds).padStart(2, '0')}
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (data.completedAt || game.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 max-w-md mx-auto text-center scanlines">
        <h1 className="text-3xl font-bold mb-4">You finished today&apos;s game!</h1>
        <p className="text-gray-600">Come back tomorrow for a new challenge.</p>
      </div>
    )
  }

  const maxLength = nextWord?.anagram?.length || 0
  const currentWordNumber = solvedCount + 1
  const totalWords = 4
  const isFinalRound = game.currentRound >= game.maxRounds

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

  return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main flex flex-col relative">
        {/* Success Banner - absolutely positioned, spans full width */}
        {showSuccess && (
          <SuccessBanner message={showSuccess} />
        )}

        {/* Error Banner - absolutely positioned, spans full width */}
        {lastError && (
          <ErrorBanner message={lastError} />
        )}

        {/* Top section with round info and timer */}
        <div className="flex flex-col items-start self-stretch flex-grow-0 flex-shrink-0">
          {/* Round info row */}
          <div className="game-round-info">
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-yellow)]">
              ROUND {game.currentRound}
            </p>
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-pink)]">
              {getDifficultyInfo(game.currentRound, maxLength)}
            </p>
          </div>

          {/* Timer section */}
          <div className="game-timer-section">
            <div className="game-timer-display">
              <div className="game-timer-number">
                {String(remainingSeconds).padStart(2, '0')}
              </div>
              <div className="text-body-small text-[color:var(--color-accent-pink)]" style={{ fontSize: '12px', letterSpacing: '-0.1em', fontWeight: 500 }}>seconds remaining</div>
            </div>
          </div>
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
                const isActive = i === currentWordNumber - 1
                return (
                  <div
                    key={i}
                    className={`game-checked-dot ${
                      isFilled 
                        ? 'game-checked-dot--filled' 
                        : isActive 
                        ? 'game-checked-dot--active' 
                        : 'game-checked-dot--empty'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* Anagram Display */}
          {nextWord?.anagram && <AnagramDisplay anagram={nextWord.anagram} />}

          {/* Answer Input and Submit Button */}
          <div className="flex flex-col items-center flex-grow-0 flex-shrink-0 gap-6 self-stretch">
            <AnswerInput
              answer={answer}
              setAnswer={setAnswer}
              maxLength={maxLength}
              onSubmit={submit}
              onWidthChange={setInputWidth}
            />

            <SubmitButton
              onClick={submit}
              disabled={!answer.trim() || submitting}
              isLoading={submitting}
              fullWidth={false}
              width={inputWidth}
            />
          </div>
        </div>
      </main>
    </div>
  )
}


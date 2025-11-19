'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import AnswerInput from '@/components/game/AnswerInput'
import SubmitButton from '@/components/game/SubmitButton'
import DeathScreen from '@/components/game/DeathScreen'
import VictoryScreen from '@/components/game/VictoryScreen'
import AnagramDisplay from '@/components/game/AnagramDisplay'
import SuccessBanner from '@/components/game/SuccessBanner'
import ErrorBanner from '@/components/game/ErrorBanner'
import RoundTransition from '@/components/game/RoundTransition'
import { getOrCreateSessionId } from '@/lib/anonymous'

// Client-side helpers for solvedWords (mirrors server-side helpers)
type SolvedWordEntry = { index: number; solvedAt: string }
type SolvedWordsOld = Record<string, number[]>
type SolvedWordsNew = Record<string, SolvedWordEntry[]>
type SolvedWords = SolvedWordsOld | SolvedWordsNew

function isNewFormat(solvedWords: SolvedWords | null): solvedWords is SolvedWordsNew {
  if (!solvedWords || Object.keys(solvedWords).length === 0) return false
  const firstRound = Object.values(solvedWords)[0]
  return Array.isArray(firstRound) && firstRound.length > 0 && typeof firstRound[0] === 'object' && 'solvedAt' in firstRound[0]
}

function getSolvedIndices(solvedWords: SolvedWords | null, roundKey: string): number[] {
  if (!solvedWords) return []
  const roundData = solvedWords[roundKey]
  if (!roundData) return []
  
  if (isNewFormat(solvedWords)) {
    return (roundData as SolvedWordEntry[]).map(entry => entry.index).sort((a, b) => a - b)
  } else {
    return (roundData as number[]).sort((a, b) => a - b)
  }
}

function getSolvedEntries(solvedWords: SolvedWords | null, roundKey: string): SolvedWordEntry[] {
  if (!solvedWords) return []
  const roundData = solvedWords[roundKey]
  if (!roundData) return []
  
  if (isNewFormat(solvedWords)) {
    return (roundData as SolvedWordEntry[]).sort((a, b) => a.index - b.index)
  } else {
    const indices = roundData as number[]
    const now = new Date().toISOString()
    return indices.map(index => ({ index, solvedAt: now })).sort((a, b) => a.index - b.index)
  }
}

export default function DailyV2Page() {
  return (
    <div className="min-h-screen">
      <DailyGameClientV2 />
    </div>
  )
}

function DailyGameClientV2() {
  const [data, setData] = useState<any>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isDead, setIsDead] = useState(false)
  const [showInterim, setShowInterim] = useState(false)
  const [completedRound, setCompletedRound] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [now, setNow] = useState<Date>(new Date())
  const [inputWidth, setInputWidth] = useState<number>(220)

  // Get session ID for logged-out users
  useEffect(() => {
    try {
      const sid = getOrCreateSessionId()
      setSessionId(sid)
    } catch {
      setSessionId(null)
    }
  }, [])

  // Refresh game data without deleting or showing loading
  const refreshGameData = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-v2/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const payload = await res.json()
        setData(payload)
        return payload
      }
    } catch (error) {
      console.error('Error refreshing game data:', error)
    }
    return null
  }, [sessionId])

  // Start game
  async function start() {
    setLoading(true)
    setIsDead(false) // Reset death state when starting fresh
    try {
      // For testing: always delete ALL games first (refresh = restart)
      // This ensures we always start fresh with a new game
      // Call delete for both logged-in (userId) and logged-out (sessionId) users
      try {
        await fetch('/api/daily-v2/delete-all-incomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId || null }),
        })
      } catch (error) {
        console.error('Error deleting games:', error)
        // Continue anyway - might already be deleted
      }
      
      const res = await fetch('/api/daily-v2/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const payload = await res.json()
        
        if (process.env.NODE_ENV === 'development') {
          // Debug: Check if round 1 start time is set
          if (payload.roundStartTimes && !payload.roundStartTimes["1"]) {
            console.warn('⚠️ Round 1 start time missing!', payload.roundStartTimes)
          }
        }
        
        setData(payload)
        setLoading(false)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      setLoading(false)
    }
  }

  // Mark game as failed on unmount (refresh/close tab)
  useEffect(() => {
    return () => {
      if (data?.game?.id && !data.completedAt && !isDead) {
        // Mark as failed in background (don't await)
        fetch('/api/daily-v2/mark-failed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: data.game.id, sessionId }),
        }).catch(() => {}) // Ignore errors
      }
    }
  }, [data?.game?.id, data?.completedAt, isDead, sessionId])

  // Initialize game
  useEffect(() => {
    if (sessionId !== null) {
      start()
    }
  }, [sessionId])

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(interval)
  }, [])

  // Get current round and word
  // Use the currentRound from API, but also verify by finding first round with unsolved words
  const currentRound = useMemo(() => {
    if (!data?.game?.rounds) return 1
    
    // If game is completed, return the last round number
    if (data.completedAt) {
      const lastRound = data.game.rounds[data.game.rounds.length - 1]
      return lastRound?.roundNumber || 3
    }
    
    let round = data?.currentRound || 1
    // Double-check: find first round with unsolved words (in case API calculation is off)
    const solvedWords = (data?.solvedWords as SolvedWords | null) || null
    for (const r of data.game.rounds) {
      const roundKey = String(r.roundNumber)
      const solved = getSolvedIndices(solvedWords, roundKey)
      const hasUnsolved = solved.length < r.words.length
      if (hasUnsolved) {
        round = r.roundNumber
        break
      }
    }
    
    // Cap at max rounds (3)
    const maxRounds = data.game.rounds.length
    return Math.min(round, maxRounds)
  }, [data?.currentRound, data?.game?.rounds, data?.completedAt, data?.solvedWords])
  
  const round = useMemo(() => {
    return data?.game?.rounds?.find((r: any) => r.roundNumber === currentRound)
  }, [data?.game?.rounds, currentRound])
  
  // Get user's solved words
  const solvedWords = useMemo(() => {
    return (data?.solvedWords as SolvedWords | null) || null
  }, [data?.solvedWords])
  
  // Find next word - get first unsolved word in current round, sorted by index
  const nextWord = useMemo(() => {
    if (!round?.words) return null
    const roundKey = String(currentRound)
    const solvedInRound = getSolvedIndices(solvedWords, roundKey)
    const unsolved = round.words
      .filter((w: any) => !solvedInRound.includes(w.index))
      .sort((a: any, b: any) => a.index - b.index)
    return unsolved[0] || null
  }, [round?.words, currentRound, solvedWords])

  const solvedCount = useMemo(() => {
    if (!round?.words) return 0
    const roundKey = String(currentRound)
    const solvedInRound = getSolvedIndices(solvedWords, roundKey)
    return solvedInRound.length
  }, [round?.words, currentRound, solvedWords])
  
  const totalWords = 3

  // Auto-set round start time if missing when accessing a round
  useEffect(() => {
    if (!data || !currentRound || loading || showInterim) return
    
    const roundKey = String(currentRound)
    const startTime = data.roundStartTimes?.[roundKey]
    
    // If round start time is missing, set it now
    if (!startTime && data.game?.id) {
      fetch('/api/daily-v2/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: data.game.id,
          roundNumber: currentRound,
          sessionId,
        }),
      }).then(res => res.json()).then(result => {
        if (result.roundStartTimes) {
          setData((prev: any) => ({
            ...prev,
            roundStartTimes: result.roundStartTimes
          }))
        }
      }).catch(() => {})
    }
  }, [data, currentRound, loading, showInterim, sessionId])

  // Calculate remaining seconds
  const remainingSeconds = useMemo(() => {
    if (!data?.roundStartTimes) return 180
    const roundKey = String(currentRound)
    const startTime = data.roundStartTimes[roundKey]
    if (!startTime) return 180 // Not started yet, show full time
    
    const start = new Date(startTime).getTime()
    const end = start + 180000 // 180 seconds
    const remaining = Math.ceil((end - now.getTime()) / 1000)
    return Math.max(0, remaining) // Ensure non-negative
  }, [data?.roundStartTimes, currentRound, now])

  // Death condition
  useEffect(() => {
    if (showInterim || submitting || !data || loading || isDead) return
    
    // Don't check if we don't have roundStartTimes at all
    if (!data.roundStartTimes) {
      return
    }
    
    const roundKey = String(currentRound)
    const startTime = data.roundStartTimes[roundKey]
    
    if (!startTime) {
      return // Round hasn't started yet, don't check death
    }
    
    // Don't check death for first 2 seconds after round starts (prevent false triggers)
    const start = new Date(startTime).getTime()
    const timeSinceStart = now.getTime() - start
    if (timeSinceStart < 2000) {
      return
    }
    
    // Also check if remainingSeconds is negative or 0 but round just started
    // This handles edge cases where timing calculations might be off
    if (remainingSeconds > 0 || timeSinceStart < 5000) {
      // If timer still has time, or round started less than 5 seconds ago, don't trigger death
      // This gives extra buffer for new games
      return
    }
    
    // Timer expired - check if any words unsolved
    const solvedWords = (data?.solvedWords as SolvedWords | null) || null
    // roundKey already defined above
    const solvedInRound = getSolvedIndices(solvedWords, roundKey)
    const hasUnsolved = round?.words && solvedInRound.length < round.words.length
    if (hasUnsolved) {
      setIsDead(true)
      // Mark as failed
      fetch('/api/daily-v2/mark-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: data.game.id, sessionId }),
      }).catch(() => {})
    }
  }, [remainingSeconds, showInterim, submitting, data, loading, isDead, round, sessionId, currentRound, now])

  // Submit answer
  async function submit() {
    if (!answer.trim() || submitting || !nextWord) return
    
    setSubmitting(true)
    setLastError(null)
    
    try {
      const res = await fetch('/api/daily-v2/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: data.game.id,
          roundNumber: currentRound,
          wordIndex: nextWord.index,
          answer: answer.trim(),
          sessionId,
        }),
      })
      
      const result = await res.json()
      
      if (result.isCorrect) {
        setShowSuccess('Fuckin\' nailed it.')
        setAnswer('')
        
        // Check if round complete before updating state
        if (result.roundComplete) {
          if (result.gameComplete) {
            // Game complete - show victory screen immediately
            setData((prev: any) => {
              const clone = JSON.parse(JSON.stringify(prev))
              const solvedWords = (clone.solvedWords as SolvedWords | null) || null
              const roundKey = String(currentRound)
              const existingEntries = getSolvedEntries(solvedWords, roundKey)
              const solvedIndices = getSolvedIndices(solvedWords, roundKey)
              if (!solvedIndices.includes(nextWord.index)) {
                const newEntry: SolvedWordEntry = { index: nextWord.index, solvedAt: new Date().toISOString() }
                const updatedEntries = [...existingEntries, newEntry].sort((a, b) => a.index - b.index)
                clone.solvedWords = {
                  ...(isNewFormat(solvedWords) ? solvedWords : {}),
                  [roundKey]: updatedEntries
                }
              }
              clone.completedAt = new Date().toISOString()
              return clone
            })
            // Don't show success banner or interim - victory screen will show
            setShowSuccess(null)
            setSubmitting(false)
            return // Exit early to prevent showing interim screen
          } else {
            // Round complete but game not complete - show interim
            // Capture the completed round number before updating state
            const completedRoundNum = currentRound
            setData((prev: any) => {
              const clone = JSON.parse(JSON.stringify(prev))
              const solvedWords = (clone.solvedWords as SolvedWords | null) || null
              const roundKey = String(currentRound)
              const existingEntries = getSolvedEntries(solvedWords, roundKey)
              const solvedIndices = getSolvedIndices(solvedWords, roundKey)
              if (!solvedIndices.includes(nextWord.index)) {
                const newEntry: SolvedWordEntry = { index: nextWord.index, solvedAt: new Date().toISOString() }
                const updatedEntries = [...existingEntries, newEntry].sort((a, b) => a.index - b.index)
                clone.solvedWords = {
                  ...(isNewFormat(solvedWords) ? solvedWords : {}),
                  [roundKey]: updatedEntries
                }
              }
              return clone
            })
            setCompletedRound(completedRoundNum)
            setShowInterim(true)
          }
        } else {
          // Word solved but round not complete - update state optimistically
          setData((prev: any) => {
            const clone = JSON.parse(JSON.stringify(prev))
            const solvedWords = (clone.solvedWords as SolvedWords | null) || null
            const roundKey = String(currentRound)
            const existingEntries = getSolvedEntries(solvedWords, roundKey)
            const solvedIndices = getSolvedIndices(solvedWords, roundKey)
            if (!solvedIndices.includes(nextWord.index)) {
              const newEntry: SolvedWordEntry = { index: nextWord.index, solvedAt: new Date().toISOString() }
              const updatedEntries = [...existingEntries, newEntry].sort((a, b) => a.index - b.index)
              clone.solvedWords = {
                ...(isNewFormat(solvedWords) ? solvedWords : {}),
                [roundKey]: updatedEntries
              }
            }
            return clone
          })
          
          // Refresh data after delay to get updated state (wait longer for DB to commit)
          // Use refreshGameData instead of start() to avoid loading screen and game deletion
          setTimeout(async () => {
            await refreshGameData()
            setShowSuccess(null)
          }, 800)
        }
        
        // Clear success message if not showing interim
        if (!result.roundComplete) {
          setTimeout(() => setShowSuccess(null), 2500)
        }
      } else {
        setLastError(result.message || 'Guess again, cowboy.')
        setAnswer('') // Clear answer on wrong submission
        setTimeout(() => setLastError(null), 2500)
      }
    } catch (error) {
      console.error('Error submitting:', error)
      setLastError('Something went wrong. Please try again.')
      setTimeout(() => setLastError(null), 2500)
    } finally {
      setSubmitting(false)
    }
  }

  // Start next round
  const startNextRound = useCallback(async () => {
    if (!data?.game?.id) return
    // Clear success banner before transitioning
    setShowSuccess(null)
    setLastError(null)
    
    // Use completedRound + 1 if available, otherwise currentRound + 1
    const nextRound = completedRound !== null ? completedRound + 1 : currentRound + 1
    try {
      const res = await fetch('/api/daily-v2/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: data.game.id,
          roundNumber: nextRound,
          sessionId,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        // Update roundStartTimes and solvedWords in local state immediately
        setData((prev: any) => ({
          ...prev,
          roundStartTimes: result.roundStartTimes,
          solvedWords: result.solvedWords || prev.solvedWords || {}
        }))
      }
      setShowInterim(false)
      setCompletedRound(null)
      // Use refreshGameData instead of start() to avoid deleting the game
      await refreshGameData()
    } catch (error) {
      console.error('Error starting next round:', error)
      setShowInterim(false)
    }
  }, [data?.game?.id, completedRound, currentRound, sessionId, refreshGameData])

  // Loading state
  if (loading || !data) {
    return (
      <div className="home-shell home-shell--tight scanlines">
        <main className="home-main flex flex-col items-center !justify-center px-8">
          <span className="loader"></span>
        </main>
      </div>
    )
  }

  // Completed game
  if (data.completedAt && !isDead) {
    const solvedWords = (data.solvedWords as SolvedWords | null) || null
    const allRoundsComplete = data.game.rounds.every((r: any) => {
      const roundKey = String(r.roundNumber)
      const solved = getSolvedIndices(solvedWords, roundKey)
      return solved.length === r.words.length
    })
    if (allRoundsComplete) {
      // Build gameResult object for v2 games
      const gameResult = {
        solvedWords: data.solvedWords,
        roundStartTimes: data.roundStartTimes,
        completedAt: data.completedAt,
        game: {
          rounds: data.game.rounds.map((r: any) => {
            const roundKey = String(r.roundNumber)
            const solvedEntries = getSolvedEntries(solvedWords, roundKey)
            return {
              roundNumber: r.roundNumber,
              startedAt: data.roundStartTimes?.[roundKey] ? new Date(data.roundStartTimes[roundKey]) : null,
              endedAt: r.roundNumber === data.game.rounds.length && data.completedAt ? new Date(data.completedAt) : null,
              words: r.words.map((w: any) => {
                const entry = solvedEntries.find(e => e.index === w.index)
                return {
                  solvedAt: entry ? new Date(entry.solvedAt) : null
                }
              })
            }
          })
        }
      }
      return <VictoryScreen gameResult={gameResult} />
    }
  }

  // Death screen
  if (isDead) {
    // Build gameResult object for v2 games
    const solvedWords = (data.solvedWords as SolvedWords | null) || null
    const gameResult = {
      solvedWords: data.solvedWords,
      roundStartTimes: data.roundStartTimes,
      completedAt: null,
      game: {
        rounds: data.game.rounds.map((r: any) => {
          const roundKey = String(r.roundNumber)
          const solvedEntries = getSolvedEntries(solvedWords, roundKey)
          return {
            roundNumber: r.roundNumber,
            startedAt: data.roundStartTimes?.[roundKey] ? new Date(data.roundStartTimes[roundKey]) : null,
            endedAt: null,
            words: r.words.map((w: any) => {
              const entry = solvedEntries.find(e => e.index === w.index)
              return {
                solvedAt: entry ? new Date(entry.solvedAt) : null
              }
            })
          }
        })
      }
    }
    return <DeathScreen correctWord={nextWord?.solution || ''} gameResult={gameResult} />
  }

  // Interim screen
  if (showInterim) {
    // Use completedRound + 1 if available, otherwise fall back to currentRound + 1
    const nextRoundNum = completedRound !== null ? completedRound + 1 : currentRound + 1
    return (
      <RoundTransition
        nextRound={nextRoundNum}
        countdownSeconds={5}
        onCountdownComplete={startNextRound}
      />
    )
  }

  // Main game UI
  // If no nextWord, show loading or error state
  if (!nextWord || !nextWord.anagram) {
    console.error('❌ No nextWord or anagram missing!', {
      nextWord,
      nextWordAnagram: nextWord?.anagram,
      currentRound,
      round: data?.game?.rounds?.find((r: any) => r.roundNumber === currentRound),
      loading,
      data: data ? { 
        hasGame: !!data.game, 
        hasRounds: !!data.game?.rounds,
        roundsCount: data.game?.rounds?.length 
      } : null
    })
    return (
      <div className="home-shell scanlines">
        <main className="home-main flex flex-col items-center justify-center">
          <p className="text-body-large text-[color:var(--color-accent-pink)]">
            No word available. Please refresh.
          </p>
        </main>
      </div>
    )
  }
  
  const maxLength = nextWord.anagram.length
  const currentWordNumber = solvedCount + 1

  // Helper function for difficulty info
  const getDifficultyInfo = (round: number, maxLength: number) => {
    if (round === 1) return 'Easy (5 letters)'
    if (round === 2) return 'Medium (6 letters)'
    return 'Hard (7 letters)'
  }

  return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main relative flex flex-col">
        {/* Success/Error banners */}
        {showSuccess && <SuccessBanner />}
        {lastError && <ErrorBanner />}

        {/* Top section with round info and timer */}
        <div className="flex flex-col items-start self-stretch flex-grow-0 flex-shrink-0">
          {/* Round info row */}
          <div className="game-round-info">
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-yellow)]">
              ROUND {currentRound}
            </p>
            <p className="flex-grow-0 flex-shrink-0 text-info-medium text-[color:var(--color-accent-pink)]">
              {getDifficultyInfo(currentRound, maxLength)}
            </p>
          </div>

          {/* Timer section */}
          <div className="game-timer-section">
            <div className="game-timer-display">
              <div className="game-timer-number">
                {String(remainingSeconds).padStart(2, '0')}
              </div>
              <div className="text-body-small text-[color:var(--color-accent-pink)]" style={{ fontSize: '12px', letterSpacing: '-0.1em', fontWeight: 500 }}>
                seconds remaining
              </div>
            </div>
          </div>
        </div>

        {/* Game content */}
        <div className="flex flex-col items-center justify-center max-md:justify-start gap-8 max-md:gap-6 flex-1 self-stretch relative w-full max-w-[440px] mx-auto max-md:mt-[72px]">

          {/* Word count */}
          <div className="game-word-count">
            <p className="text-info-small text-[color:var(--color-accent-pink)]">
              WORD {currentWordNumber} OF {totalWords}
            </p>
            <div className="flex items-start gap-3">
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

          {/* Anagram */}
          {nextWord?.anagram && <AnagramDisplay anagram={nextWord.anagram} />}

          {/* Answer input */}
          {nextWord?.anagram && (
            <div className="flex flex-col items-center gap-6 self-stretch">
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
          )}
        </div>
      </main>
    </div>
  )
}


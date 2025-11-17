'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import AnswerInput from '@/components/game/AnswerInput'
import SubmitButton from '@/components/game/SubmitButton'
import DeathScreen from '@/components/game/DeathScreen'
import VictoryScreen from '@/components/game/VictoryScreen'
import AnagramDisplay from '@/components/game/AnagramDisplay'
import SuccessBanner from '@/components/game/SuccessBanner'
import ErrorBanner from '@/components/game/ErrorBanner'

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
  const isLoadingRef = useRef(false)

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
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    
    try {
      const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
      const res = await fetch(`/api/daily/data${qs}`, { cache: 'no-store' })
      if (res.ok) {
        setData(await res.json())
      } else {
        setData(null)
      }
      setLoading(false)
    } finally {
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (sessionId === undefined) return // Wait for sessionId to be set (null is valid)
    if (isLoadingRef.current) return // Already loading
    
    let cancelled = false
    
    ;(async () => {
      const ok = await start()
      if (cancelled) return
      if (!ok) {
        await load()
      }
    })()
    
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Tick timer every 500ms
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(t)
  }, [])

  const game = data?.game
  const currentRound = game?.rounds?.find((r: any) => r.roundNumber === game?.currentRound)
  const nextWord = currentRound?.words?.find((w: any) => !w.solvedAt)
  const solvedCount = currentRound?.words?.filter((w: any) => w.solvedAt).length || 0

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
    const start = new Date(currentRound.startedAt).getTime()
    if (Date.now() - start < 1000) return
    if (remainingSeconds === 0) {
      const anyUnsolved = currentRound.words.some((w: any) => !w.solvedAt)
      if (anyUnsolved) setIsDead(true)
    }
  }, [remainingSeconds, currentRound, showInterim])

  // Interim countdown effect
  useEffect(() => {
    if (!showInterim) return
    setInterimSeconds(5)
    const timer = setInterval(() => {
      setInterimSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer)
          setShowInterim(false)
          ;(async () => {
            // Start the next round now, then load
            if (data?.game?.id) {
              await fetch('/api/daily/next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: data.game.id }),
              })
            }
            await load()
          })()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showInterim])

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
      setShowSuccess("Fuckin' nailed it.")
      setTimeout(() => setShowSuccess(null), 2000)
      // Optimistically advance current word
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

      // If round complete, show interim (5s) or victory
      if (payload.roundComplete) {
        if (payload.isGameComplete) {
          setIsWinner(true)
        } else {
          setUpcomingRound((game.currentRound || 1) + 1)
          setShowInterim(true)
        }
      } else {
        // Not round complete: pull fresh state in background to sync attempts
        await load()
      }
    } else {
      // Wrong answer: keep current anagram and do not reload (prevents anagram change)
      setLastError("Guess again, cowboy.")
      setTimeout(() => setLastError(null), 2000)
    }

    setAnswer('')
  }

  // Early returns
  if (loading) return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main flex flex-col items-center justify-center">
        <span className="loader"></span>
      </main>
    </div>
  )
  if (!data) return <div className="min-h-screen flex items-center justify-center scanlines">No daily game</div>

  if (isDead) {
    const correctWord = nextWord?.solution || ''
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
    return <VictoryScreen />
  }

  if (showInterim) {
    return (
      <div className="home-shell scanlines">
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
        <div className="flex flex-col items-center justify-center gap-8 flex-1 self-stretch relative w-full max-w-[440px] mx-auto">

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
          {nextWord?.anagram && <AnagramDisplay anagram={nextWord.anagram} />}

          {/* Answer Input and Submit Button */}
          <div className="flex flex-col items-center flex-grow-0 flex-shrink-0 gap-6 self-stretch">
            <AnswerInput
              answer={answer}
              setAnswer={setAnswer}
              maxLength={maxLength}
              onSubmit={submit}
            />

            <SubmitButton
              onClick={submit}
              disabled={!answer.trim() || submitting}
              isLoading={submitting}
              fullWidth={false}
              width={220}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

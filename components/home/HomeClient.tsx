'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import StatsOverlay from '@/components/stats/StatsOverlay'
import Logo from '@/components/Logo'
import AnimatedSkull from './AnimatedSkull'
import ClaimGameModal from '@/components/ClaimGameModal'
import { getOrCreateSessionId } from '@/lib/anonymous'

const LogoutLink = dynamic(() => import('@/components/LogoutLink'), { ssr: false })

interface HomeClientProps {
  user: {
    id: string
  } | null
}

export default function HomeClient({ user }: HomeClientProps) {
  const [showStats, setShowStats] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [countdown, setCountdown] = useState<string>('00:00:00')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [gameNumber, setGameNumber] = useState<number>(1)
  const [showClaimModal, setShowClaimModal] = useState(false)

  // Get session ID for logged-out users (also needed when logged in to check for anonymous games)
  const [sessionIdReady, setSessionIdReady] = useState(false)
  const claimedRef = useRef(false) // Track if we've already attempted to claim games
  const hasCheckedClaim = useRef(false) // Track if we've checked for anonymous games
  const previousUserIdRef = useRef<string | null>(null) // Track previous user to detect user switches
  
  // Helper function to get declined key for localStorage
  const getDeclinedKey = (sessionId: string | null) => {
    if (!sessionId) return null
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return `anagram_declined_${sessionId}_${today}`
  }
  
  useEffect(() => {
    try {
      const sid = getOrCreateSessionId()
      setSessionId(sid)
    } catch {
      setSessionId(null)
    } finally {
      // Mark sessionId as ready (even if null, we know it's been checked)
      setSessionIdReady(true)
    }
  }, [])
  
  // Clear sessionId only when a different user logs in (to prevent cross-user claiming)
  useEffect(() => {
    if (user?.id && previousUserIdRef.current && previousUserIdRef.current !== user.id) {
      // Different user logged in - clear sessionId to prevent cross-user claiming
      if (typeof window !== 'undefined') {
        localStorage.removeItem('anagram_session_id')
      }
      // Reset sessionId state to force regeneration
      setSessionId(null)
      setSessionIdReady(false)
      hasCheckedClaim.current = false
      claimedRef.current = false
      // Regenerate sessionId for the new user
      try {
        const sid = getOrCreateSessionId()
        setSessionId(sid)
        setSessionIdReady(true)
      } catch {
        setSessionId(null)
        setSessionIdReady(true)
      }
    }
    previousUserIdRef.current = user?.id || null
  }, [user?.id])

  // Check for anonymous games when user logs in (show modal instead of auto-claiming)
  useEffect(() => {
    // Only check if:
    // 1. User is logged in
    // 2. SessionId is ready and exists
    // 3. We haven't checked yet for this user
    if (!user?.id || !sessionIdReady || !sessionId || hasCheckedClaim.current) return

    // Check if user has declined to claim today
    const declinedKey = getDeclinedKey(sessionId)
    if (declinedKey && typeof window !== 'undefined') {
      const hasDeclined = localStorage.getItem(declinedKey)
      if (hasDeclined) {
        hasCheckedClaim.current = true
        return // Don't show modal if user declined today
      }
    }

    hasCheckedClaim.current = true

    async function checkForAnonymousGame() {
      try {
        const res = await fetch(`/api/daily-v2/check-claim?sessionId=${encodeURIComponent(sessionId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.hasAnonymousGame) {
            setShowClaimModal(true)
          }
        }
      } catch (error) {
        console.error('Error checking for anonymous game:', error)
      }
    }

    checkForAnonymousGame()
  }, [user?.id, sessionId, sessionIdReady])

  // Handle claim confirmation
  const handleClaimConfirm = async () => {
    setShowClaimModal(false)
    claimedRef.current = true
    try {
      await fetch('/api/daily-v2/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      // Refresh status to show claimed game
      window.location.reload()
    } catch (error) {
      console.error('Error claiming game:', error)
    }
  }

  // Handle claim cancellation
  const handleClaimCancel = async () => {
    setShowClaimModal(false)
    
    if (!sessionId) {
      hasCheckedClaim.current = true
      claimedRef.current = true
      return
    }
    
    try {
      // Delete the anonymous game
      await fetch('/api/daily-v2/delete-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      
      // Store declined state in localStorage (scoped to today)
      const declinedKey = getDeclinedKey(sessionId)
      if (declinedKey && typeof window !== 'undefined') {
        localStorage.setItem(declinedKey, 'true')
      }
      
      // Mark that we've checked so we don't show the modal again
      hasCheckedClaim.current = true
      claimedRef.current = true
      
      // Refresh status to update UI (remove countdown timer)
      const url = sessionId 
        ? `/api/daily-v2/status?sessionId=${encodeURIComponent(sessionId)}` 
        : '/api/daily-v2/status'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setHasPlayed(data.hasPlayed || false)
      }
    } catch (error) {
      console.error('Error declining claim:', error)
      hasCheckedClaim.current = true
      claimedRef.current = true
    }
  }

  // Reset claimedRef when user logs out (but keep sessionId for when they log back in)
  useEffect(() => {
    if (!user?.id) {
      claimedRef.current = false
      hasCheckedClaim.current = false
      // Don't clear sessionId on logout - we need it to check for anonymous games when they log back in
      // sessionId will only be cleared when a different user logs in (handled above)
      // Re-read sessionId from localStorage to ensure it's available for status check
      try {
        const sid = getOrCreateSessionId()
        setSessionId(sid)
        setSessionIdReady(true)
      } catch {
        setSessionId(null)
        setSessionIdReady(true)
      }
    }
  }, [user?.id])

  // Check game status and update countdown
  // Only run after sessionId has been determined (ready or confirmed null)
  useEffect(() => {
    // Don't check status until sessionId is ready
    if (!sessionIdReady) return
    
    let interval: NodeJS.Timeout | null = null
    let nextGameTime: string | null = null
    
    async function checkStatus() {
      try {
        // Always pass sessionId if available, even when logged in
        // This allows the status endpoint to check for anonymous games that can be claimed
        const url = sessionId 
          ? `/api/daily-v2/status?sessionId=${encodeURIComponent(sessionId)}` 
          : '/api/daily-v2/status'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setHasPlayed(data.hasPlayed || false)
          nextGameTime = data.nextGameTime
          
          // Start countdown timer
          if (data.secondsUntilNext !== null && data.nextGameTime) {
            const updateCountdown = () => {
              if (!nextGameTime) return
              const now = new Date().getTime()
              const nextGame = new Date(nextGameTime).getTime()
              const secondsLeft = Math.max(0, Math.floor((nextGame - now) / 1000))
              
              const hours = Math.floor(secondsLeft / 3600)
              const minutes = Math.floor((secondsLeft % 3600) / 60)
              const secs = secondsLeft % 60
              
              setCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
            }
            
            updateCountdown()
            interval = setInterval(updateCountdown, 1000)
          }
        }
      } catch (error) {
        console.error('Error checking game status:', error)
      }
    }
    
    checkStatus()
    
    // Re-check status when page becomes visible (user returns from game)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also re-check periodically (every 30 seconds) to catch completed games
    const statusInterval = setInterval(checkStatus, 30000)
    
    return () => {
      if (interval) clearInterval(interval)
      if (statusInterval) clearInterval(statusInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sessionId, sessionIdReady, user]) // Re-check when user logs in/out

  // Fetch game number
  useEffect(() => {
    async function fetchGameNumber() {
      try {
        const response = await fetch('/api/daily/round-number')
        if (response.ok) {
          const data = await response.json()
          setGameNumber(data.roundNumber || 1)
        }
      } catch (error) {
        console.error('Error fetching game number:', error)
        // Default to 1 on error
        setGameNumber(1)
      }
    }
    fetchGameNumber()
  }, [])

  // Reset game (secret click on date)
  async function handleReset() {
    try {
      // Call delete endpoint - it will use userId from session if logged in, or sessionId if logged out
      await fetch('/api/daily-v2/delete-all-incomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId || null }),
      })
      // Reload to refresh status
      window.location.reload()
    } catch (error) {
      console.error('Error resetting game:', error)
    }
  }

  return (
    <>
      <div className="home-shell scanlines">
        <main className="home-main">
          <header className="home-header">
            <Logo className="w-full h-auto block" />
          </header>

          <section className="home-content">
            <div className="home-copy">
              <AnimatedSkull />
              <span className="text-body-large text-[color:var(--color-accent-pink)]">
                Solve 9 anagrams in 9 minutes.
                <br />
                <span className="text-[color:var(--color-accent-yellow)] mt-1 inline-block">Or die.</span>
              </span>
            </div>

            {hasPlayed && (
              <div 
                className="w-full px-5 flex flex-col items-center" 
                style={{ 
                  // Counteract parent gap (32px) to get exact 24px spacing from headline
                  marginTop: 'calc(24px - var(--space-gap-lg))',
                  // Counteract parent gap (32px) to get exact 20px spacing to CTA
                  marginBottom: 'calc(20px - var(--space-gap-lg))'
                }}
              >
                <div 
                  className="flex flex-col items-center w-full"
                  style={{
                    border: '1px solid var(--color-accent-pink)',
                    borderRadius: '8px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    gap: '4px',
                    background: 'var(--color-bg)'
                  }}
                >
                  <div 
                    className="text-[color:var(--color-accent-pink)]"
                    style={{ 
                      fontFamily: 'var(--font-rubik), sans-serif',
                      fontSize: '48px',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      lineHeight: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {countdown.split('').map((char, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-block',
                          width: char === ':' ? '10px' : '32px',
                          textAlign: 'center',
                          marginLeft: char === ':' && index > 0 ? '2px' : '0',
                          marginRight: char === ':' && index < countdown.length - 1 ? '2px' : '0'
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <span className="text-info-small text-[color:var(--color-accent-pink)]">
                    until next game
                  </span>
                </div>
              </div>
            )}

            {!hasPlayed && (
              <div className="w-full px-5 flex flex-col gap-[20px]">
                <Link href="/daily-v2" className="btn-primary btn-primary--animated">
                  <span className="text-body-medium">
                    Play today's game
                  </span>
                </Link>

                <div className={user ? "flex flex-col gap-[20px]" : "flex flex-row gap-[20px]"}>
                  {user ? (
                    <>
                      <button
                        onClick={() => setShowStats(true)}
                        className="btn-secondary"
                      >
                        <span className="text-body-medium">View stats</span>
                      </button>
                      <div className="flex items-center justify-center">
                        <LogoutLink />
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="btn-secondary">
                        <span className="text-body-medium">Log in</span>
                      </Link>
                      <Link href="/register" className="btn-secondary">
                        <span className="text-body-medium">Sign up</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {hasPlayed && (
              <div className="w-full px-5 flex flex-col gap-[20px]">
                <div className={user ? "flex flex-col gap-[20px]" : "flex flex-row gap-[20px]"}>
                  {user ? (
                    <>
                      <button
                        onClick={() => setShowStats(true)}
                        className="btn-secondary"
                      >
                        <span className="text-body-medium">View stats</span>
                      </button>
                      <div className="flex items-center justify-center">
                        <LogoutLink />
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="btn-secondary">
                        <span className="text-body-medium">Log in</span>
                      </Link>
                      <Link href="/register" className="btn-secondary">
                        <span className="text-body-medium">Sign up</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <footer className="home-footer">
            <span 
              className="text-info-small text-[color:var(--color-accent-pink)] cursor-pointer"
              onClick={handleReset}
              style={{ userSelect: 'none' }}
            >
              {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              Game—{gameNumber}
            </span>
          </footer>
        </main>
      </div>

      <StatsOverlay isOpen={showStats} onClose={() => setShowStats(false)} />
      <ClaimGameModal 
        isOpen={showClaimModal}
        onConfirm={handleClaimConfirm}
        onCancel={handleClaimCancel}
      />
    </>
  )
}


'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface StatsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

interface StatsData {
  gameWins: number
  winPercentage: number
  gamesPlayed: number
  dailyStreak: number
  globalRank: number | null
  roundsCompleted: number
  anagramsSolved: number
  avgWordTime: string
  avgRoundTime: string
}

export default function StatsOverlay({ isOpen, onClose }: StatsOverlayProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      // Add cache-busting parameter to ensure fresh data
      fetch(`/api/stats?t=${Date.now()}`, {
        cache: 'no-store',
      })
        .then((res) => res.json())
        .then((data) => {
          setStats(data)
          setLoading(false)
        })
        .catch((error) => {
          console.error('Error fetching stats:', error)
          setLoading(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Overlay */}
      <div className={`fixed inset-x-0 bottom-0 bg-[color:var(--color-accent-yellow)] z-50 stats-overlay ${isOpen ? 'open' : ''}`} style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute w-6 h-6 flex items-center justify-center"
          style={{ top: '16px', right: '16px' }}
          aria-label="Close"
        >
          <span className="text-black text-2xl font-bold">×</span>
        </button>

        <div className="max-w-[432px] mx-auto px-5 relative">
          {/* Heading */}
          <h2 className="text-body-large text-black text-center mb-8">Your stats</h2>

          {loading ? (
            <div className="text-center text-black">Loading...</div>
          ) : stats ? (
            <div className="flex flex-col gap-6">
              {/* Top row - 4 large stats */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="flex flex-col items-center">
                  <p className="text-[48px] font-bold italic text-black" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
                    {stats.gameWins}
                  </p>
                  <p className="text-info-small text-black">GAME WINS</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[48px] font-bold italic text-black" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
                    {stats.winPercentage}%
                  </p>
                  <p className="text-info-small text-black">WIN %</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[48px] font-bold italic text-black" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
                    {stats.gamesPlayed}
                  </p>
                  <p className="text-info-small text-black">GAMES PLAYED</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[48px] font-bold italic text-black" style={{ fontFamily: 'var(--font-rubik), sans-serif' }}>
                    {stats.dailyStreak}
                  </p>
                  <p className="text-info-small text-black">DAILY STREAK</p>
                </div>
              </div>

              {/* Bottom list */}
              <div className="flex flex-col gap-0 border-t border-black/20 pt-4">
                <div className="flex justify-between items-center py-2 border-b border-black">
                  <p className="text-info-small text-black">GLOBAL RANK</p>
                  <p className="text-info-small text-black">{stats.globalRank || '—'}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/20">
                  <p className="text-info-small text-black">ROUNDS COMPLETED</p>
                  <p className="text-info-small text-black">{stats.roundsCompleted}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/20">
                  <p className="text-info-small text-black">ANAGRAMS SOLVED</p>
                  <p className="text-info-small text-black">{stats.anagramsSolved}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/20">
                  <p className="text-info-small text-black">AVG WORD TIME</p>
                  <p className="text-info-small text-black">{stats.avgWordTime}</p>
                </div>
                <div className="flex justify-between items-center py-2">
                  <p className="text-info-small text-black">AVG ROUND TIME</p>
                  <p className="text-info-small text-black">{stats.avgRoundTime}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-black">Error loading stats</div>
          )}
        </div>
      </div>
    </>
  )
}


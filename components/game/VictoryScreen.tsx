'use client'

import Link from 'next/link'
import ConfettiEffect from '@/components/ConfettiEffect'

interface VictoryScreenProps {
  gameResult?: {
    solvedWords?: Record<string, number[]> // V2: which words were solved per round
    roundStartTimes?: Record<string, string> // V2: round start times
    completedAt?: Date | null
    roundResults?: Array<{
      roundNumber: number
      correctAttempts: number
    }>
    game: {
      anagrams?: Array<{
        roundNumber: number
        roundStartedAt: Date | null
        roundEndedAt: Date | null
        timeSeconds: number
      }>
      rounds?: Array<{
        roundNumber: number
        startedAt: Date | null
        endedAt: Date | null
        words: Array<{
          solvedAt: Date | null
        }>
      }>
    }
    submissionAttempts?: Array<{
      roundNumber: number
      isCorrect: boolean
      timeSinceRoundStart: number // milliseconds
    }>
  } | null
}

// Helper to format time as "2m 12s" or "23s"
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default function VictoryScreen({ gameResult }: VictoryScreenProps) {
  // Calculate stats from the completed game (same logic as DeathScreen)
  let roundsCompleted = 0
  let avgRoundTime = '0s'
  let quickestRoundTime = '0s'
  let avgWordTime = '0s'
  let quickestWordTime = '0s'

  if (gameResult) {
    // Check if this is a v2 daily game (has solvedWords and roundStartTimes)
    const isV2DailyGame = !!gameResult.solvedWords && !!gameResult.roundStartTimes

    if (isV2DailyGame && gameResult.game.rounds) {
      // V2 daily game: calculate from solvedWords and roundStartTimes
      const solvedWords = gameResult.solvedWords as Record<string, number[] | Array<{ index: number; solvedAt: string }>>
      const roundStartTimes = gameResult.roundStartTimes as Record<string, string>
      
      // Helper to get solved indices (handles both old and new formats)
      const getSolvedIndices = (roundKey: string): number[] => {
        const roundData = solvedWords[roundKey]
        if (!roundData) return []
        if (Array.isArray(roundData) && roundData.length > 0 && typeof roundData[0] === 'object' && 'solvedAt' in roundData[0]) {
          return (roundData as Array<{ index: number; solvedAt: string }>).map(e => e.index).sort((a, b) => a - b)
        }
        return (roundData as number[]).sort((a, b) => a - b)
      }
      
      // Count completed rounds (rounds where all words are solved)
      const completedRounds = gameResult.game.rounds.filter(r => {
        const roundKey = String(r.roundNumber)
        const solvedInRound = getSolvedIndices(roundKey)
        return solvedInRound.length === r.words.length
      })
      roundsCompleted = completedRounds.length

      if (completedRounds.length > 0) {
        // Calculate round times
        const roundTimes: number[] = []
        completedRounds.forEach(r => {
          const roundKey = String(r.roundNumber)
          const startTime = roundStartTimes[roundKey]
            if (startTime) {
              const start = new Date(startTime).getTime()
              // For v2, use completedAt for the last round, or next round's start time for others
              let endTime: number
              if (r.endedAt) {
                endTime = new Date(r.endedAt).getTime()
              } else if (gameResult.completedAt && gameResult.game.rounds && r.roundNumber === gameResult.game.rounds.length) {
                // Last round - use completedAt
                endTime = new Date(gameResult.completedAt).getTime()
              } else {
                // Try to use next round's start time for accurate completion time
                const nextRoundKey = String(r.roundNumber + 1)
                const nextRoundStartTime = roundStartTimes[nextRoundKey]
                
                if (nextRoundStartTime) {
                  // Use next round's start time as this round's end time (most accurate)
                  endTime = new Date(nextRoundStartTime).getTime()
                } else {
                  // Next round hasn't started - estimate ~90% of round duration
                  endTime = start + (180 * 1000 * 0.9) // ~162 seconds
                }
              }
              const duration = Math.floor((endTime - start) / 1000) // seconds
              roundTimes.push(duration)
            }
        })

        if (roundTimes.length > 0) {
          // Average round time
          const totalRoundTime = roundTimes.reduce((sum, time) => sum + time, 0)
          avgRoundTime = formatTime(Math.floor(totalRoundTime / roundTimes.length))

          // Quickest round time
          const quickest = Math.min(...roundTimes)
          quickestRoundTime = formatTime(quickest)

          // Calculate word times from precise timestamps (if available) or estimate
          const wordTimes: number[] = []
          completedRounds.forEach(r => {
            const roundKey = String(r.roundNumber)
            const startTime = roundStartTimes[roundKey]
            
            if (startTime) {
              const roundStart = new Date(startTime).getTime()
              
              // Try to get precise timestamps from solvedWords entries
              const roundData = solvedWords[roundKey] || []
              const hasPreciseTimestamps = Array.isArray(roundData) && roundData.length > 0 && 
                typeof roundData[0] === 'object' && 'solvedAt' in roundData[0]
              
              if (hasPreciseTimestamps) {
                // Use precise timestamps from solvedWords
                const entries = roundData as Array<{ index: number; solvedAt: string }>
                entries.forEach(entry => {
                  const solvedTime = new Date(entry.solvedAt).getTime()
                  const wordTime = Math.floor((solvedTime - roundStart) / 1000) // seconds
                  wordTimes.push(Math.max(1, wordTime))
                })
              } else {
                // Fallback: estimate round end time and distribute evenly
                const indices = roundData as number[]
                let roundEnd: number
                if (r.endedAt) {
                  roundEnd = new Date(r.endedAt).getTime()
                } else if (gameResult.completedAt && gameResult.game.rounds && r.roundNumber === gameResult.game.rounds.length) {
                  roundEnd = new Date(gameResult.completedAt).getTime()
                } else {
                  roundEnd = roundStart + (180 * 1000)
                }
                const roundDuration = Math.floor((roundEnd - roundStart) / 1000)
                
                // Distribute round time evenly across solved words
                const avgTimePerWord = Math.floor(roundDuration / indices.length)
                indices.forEach((_, index) => {
                  const wordTime = Math.floor((avgTimePerWord * (index + 1)) - (avgTimePerWord / 2))
                  wordTimes.push(Math.max(1, wordTime))
                })
              }
            }
          })

          if (wordTimes.length > 0) {
            // Average word time
            const totalWordTime = wordTimes.reduce((sum, time) => sum + time, 0)
            avgWordTime = formatTime(Math.floor(totalWordTime / wordTimes.length))

            // Quickest word time
            const quickestWord = Math.min(...wordTimes)
            quickestWordTime = formatTime(quickestWord)
          }
        }
      }
    } else if (gameResult.game.rounds) {
      // V1 daily game: calculate from rounds and words
      const rounds = gameResult.game.rounds
      // Only count rounds where all words are solved
      const completedRounds = rounds.filter(r => r.words.every(w => w.solvedAt))
      roundsCompleted = completedRounds.length

      if (completedRounds.length > 0) {
        // Calculate round times
        const roundTimes: number[] = []
        completedRounds.forEach(r => {
          if (r.startedAt) {
            const start = new Date(r.startedAt).getTime()
            let endTime: number
            if (r.endedAt) {
              endTime = new Date(r.endedAt).getTime()
            } else {
              // Use last word's solvedAt as end time
              const solvedWords = r.words.filter(w => w.solvedAt).sort((a, b) => 
                new Date(a.solvedAt!).getTime() - new Date(b.solvedAt!).getTime()
              )
              if (solvedWords.length > 0) {
                endTime = new Date(solvedWords[solvedWords.length - 1].solvedAt!).getTime()
              } else {
                endTime = new Date().getTime()
              }
            }
            const duration = Math.floor((endTime - start) / 1000) // seconds
            roundTimes.push(duration)
          }
        })

        if (roundTimes.length > 0) {
          // Average round time
          const totalRoundTime = roundTimes.reduce((sum, time) => sum + time, 0)
          avgRoundTime = formatTime(Math.floor(totalRoundTime / roundTimes.length))

          // Quickest round time
          const quickest = Math.min(...roundTimes)
          quickestRoundTime = formatTime(quickest)

          // Calculate word times from solvedAt timestamps
          const wordTimes: number[] = []
          completedRounds.forEach(r => {
            if (r.startedAt) {
              const roundStart = new Date(r.startedAt).getTime()
              const solvedWords = r.words.filter(w => w.solvedAt).sort((a, b) => 
                new Date(a.solvedAt!).getTime() - new Date(b.solvedAt!).getTime()
              )
              solvedWords.forEach(w => {
                if (w.solvedAt) {
                  const solvedTime = new Date(w.solvedAt).getTime()
                  const wordTime = Math.floor((solvedTime - roundStart) / 1000) // seconds
                  wordTimes.push(wordTime)
                }
              })
            }
          })

          if (wordTimes.length > 0) {
            // Average word time
            const totalWordTime = wordTimes.reduce((sum, time) => sum + time, 0)
            avgWordTime = formatTime(Math.floor(totalWordTime / wordTimes.length))

            // Quickest word time
            const quickestWord = Math.min(...wordTimes)
            quickestWordTime = formatTime(quickestWord)
          }
        }
      }
    } else if (gameResult.roundResults) {
      // Competitive game: use existing logic
      const completedRounds = gameResult.roundResults.filter(rr => rr.correctAttempts > 0)
      roundsCompleted = completedRounds.length

      if (completedRounds.length > 0) {
        // Calculate round times
        const roundTimes: number[] = []
        completedRounds.forEach(rr => {
          const anagram = gameResult.game.anagrams?.find(a => a.roundNumber === rr.roundNumber)
          if (anagram?.roundStartedAt) {
            let endTime: number
            if (anagram.roundEndedAt) {
              endTime = new Date(anagram.roundEndedAt).getTime()
            } else {
              const roundSubmissions = gameResult.submissionAttempts?.filter(
                sa => sa.roundNumber === rr.roundNumber
              ) || []
              if (roundSubmissions.length > 0) {
                const lastSubmission = roundSubmissions[roundSubmissions.length - 1]
                endTime = new Date(anagram.roundStartedAt).getTime() + lastSubmission.timeSinceRoundStart
              } else {
                endTime = new Date().getTime()
              }
            }
            const start = new Date(anagram.roundStartedAt).getTime()
            const duration = Math.floor((endTime - start) / 1000) // seconds
            roundTimes.push(duration)
          }
        })

        if (roundTimes.length > 0) {
          const totalRoundTime = roundTimes.reduce((sum, time) => sum + time, 0)
          avgRoundTime = formatTime(Math.floor(totalRoundTime / roundTimes.length))
          const quickest = Math.min(...roundTimes)
          quickestRoundTime = formatTime(quickest)

          if (gameResult.submissionAttempts && gameResult.submissionAttempts.length > 0) {
            const correctSubmissions = gameResult.submissionAttempts.filter(
              sa => sa.isCorrect && completedRounds.some(rr => rr.roundNumber === sa.roundNumber)
            )
            
            if (correctSubmissions.length > 0) {
              const wordTimesInSeconds = correctSubmissions.map(sa => Math.floor(sa.timeSinceRoundStart / 1000))
              const totalWordTime = wordTimesInSeconds.reduce((sum, time) => sum + time, 0)
              avgWordTime = formatTime(Math.floor(totalWordTime / wordTimesInSeconds.length))
              const quickestWord = Math.min(...wordTimesInSeconds)
              quickestWordTime = formatTime(quickestWord)
            }
          }
        }
      }
    }
  }

  const stats = [
    { label: 'ROUNDS COMPLETED', value: roundsCompleted.toString() },
    { label: 'AVG ROUND TIME', value: avgRoundTime },
    { label: 'QUICKEST ROUND TIME', value: quickestRoundTime },
    { label: 'AVG WORD TIME', value: avgWordTime },
    { label: 'QUICKEST WORD TIME', value: quickestWordTime },
  ]

  return (
    <div className="flex flex-col justify-start items-center w-full h-screen overflow-hidden gap-[152px] p-3 bg-black scanlines">
      <ConfettiEffect duration={5000} />
      <div className="flex flex-col justify-between items-center self-stretch flex-grow border-[3px] border-[color:var(--color-border-pink)]">
        {/* Top section - "You win!" */}
        <div className="flex flex-col justify-start items-center self-stretch flex-grow-0 flex-shrink-0 relative gap-4 py-6 border-b border-[color:var(--color-border-pink)]">
          <p className="self-stretch flex-grow-0 flex-shrink-0 text-heading-jumbo text-center text-[color:var(--color-accent-yellow)]">
            You win!
          </p>
        </div>

        {/* Middle section - Congrats text and Home button */}
        <div className="flex flex-col justify-center items-center self-stretch flex-grow-0 flex-shrink-0 relative gap-8 px-5 max-w-[440px] w-full mx-auto">
          <p className="flex-grow-0 flex-shrink-0 text-body-large text-center text-[color:var(--color-accent-pink)]">
            Congrats, you rock.
          </p>
          <Link
            href="/"
            className="flex flex-col justify-center items-center self-stretch flex-grow-0 flex-shrink-0 relative overflow-hidden gap-2 px-6 py-3 rounded-lg bg-[color:var(--color-accent-pink)]"
            style={{
              boxShadow: '-2px 0px 0px 0 #fae26e, 2px 0px 0px 0 #fae26e, 0px 2px 9px -1.5px rgba(0,0,0,0.28), 0px 2px 0px 0 #03e6a6',
            }}
          >
            <p className="flex-grow-0 flex-shrink-0 text-body-medium text-center text-black">Home</p>
          </Link>
        </div>

        {/* Bottom section - Stats */}
        <div className="flex flex-col justify-start items-center self-stretch flex-grow-0 flex-shrink-0">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 px-4 py-[7px] border-t ${index === 0 ? 'border-[color:var(--color-border-pink)]' : ''}`}
              style={{ borderColor: index === 0 ? 'var(--color-border-pink)' : 'rgba(255, 112, 217, 0.16)' }}
            >
              <p className="flex-grow-0 flex-shrink-0 text-sm font-bold italic text-center text-[color:var(--color-accent-pink)]">
                {stat.label}
              </p>
              <p className="flex-grow-0 flex-shrink-0 text-sm font-bold italic text-center text-[color:var(--color-accent-pink)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

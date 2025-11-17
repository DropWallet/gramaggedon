'use client'

interface RoundIndicatorProps {
  currentRound: number
  maxRounds: number
}

export default function RoundIndicator({ currentRound, maxRounds }: RoundIndicatorProps) {
  return (
    <div className="text-center mb-4">
      <p className="text-sm font-bold text-black">
        Round {currentRound} of {maxRounds}
      </p>
    </div>
  )
}


'use client'

interface PlayerStatusProps {
  remainingPlayers: number
  totalPlayers: number
}

export default function PlayerStatus({ remainingPlayers, totalPlayers }: PlayerStatusProps) {
  return (
    <div className="text-center mb-4">
      <p className="text-sm font-bold text-black">
        {remainingPlayers} {remainingPlayers === 1 ? 'player' : 'players'} remaining
      </p>
    </div>
  )
}


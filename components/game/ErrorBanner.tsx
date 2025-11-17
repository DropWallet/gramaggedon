'use client'

import Image from 'next/image'

interface ErrorBannerProps {
  message?: string
}

export default function ErrorBanner({ message = "Guess again, cowboy." }: ErrorBannerProps) {
  return (
    <div className="game-error-banner">
      <div className="game-error-banner-content">
        <Image
          src="/svg-failure.svg"
          alt=""
          width={14}
          height={16}
          className="flex-grow-0 flex-shrink-0 w-3.5 h-4 relative"
        />
        <p className="flex-grow-0 flex-shrink-0 text-base font-medium text-center text-[color:var(--color-error-text)]">
          {message}
        </p>
        <Image
          src="/svg-failure.svg"
          alt=""
          width={14}
          height={16}
          className="flex-grow-0 flex-shrink-0 w-3.5 h-4 relative"
        />
      </div>
    </div>
  )
}


'use client'

import Image from 'next/image'

interface SuccessBannerProps {
  message?: string
}

export default function SuccessBanner({ message = "Fuckin' nailed it." }: SuccessBannerProps) {
  return (
    <div className="game-success-banner">
      <div className="game-success-banner-content">
        <Image
          src="/svg-success.svg"
          alt=""
          width={23}
          height={20}
          className="flex-grow-0 flex-shrink-0 w-[23px] h-5 relative"
        />
        <p className="flex-grow-0 flex-shrink-0 text-base font-medium text-center text-[color:var(--color-success-text)]">
          {message}
        </p>
        <Image
          src="/svg-success.svg"
          alt=""
          width={23}
          height={20}
          className="flex-grow-0 flex-shrink-0 w-[23px] h-5 relative"
        />
      </div>
    </div>
  )
}


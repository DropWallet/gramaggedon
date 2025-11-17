'use client'

import Link from 'next/link'

export default function VictoryScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-50 to-pink-50 px-4 scanlines">
      <div className="text-center max-w-md mx-auto victory-animation">
        <h1 className="text-4xl font-bold text-black mb-6 font-serif">
          Congratulations, you are the champ
        </h1>
        <div className="mt-8">
          <Link
            href="/"
            className="block w-full bg-gradient-to-r from-teal-400 to-green-500 hover:from-teal-500 hover:to-green-600 text-white font-bold py-4 px-8 rounded-lg text-center transition-all shadow-lg"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}


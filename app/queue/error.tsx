'use client'

export default function QueueError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-pink-50">
      <div className="text-center px-4">
        <h2 className="text-2xl font-bold mb-4">Queue Error</h2>
        <p className="text-gray-600 mb-4">{error.message || 'Failed to join queue'}</p>
        <button
          onClick={reset}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}


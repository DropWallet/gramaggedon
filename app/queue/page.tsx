import { getNextGameTime, getBattleNumber, formatGameDate } from '@/lib/game-schedule'
import Logo from '@/components/Logo'
import QueuePageClient from './QueuePageClient'

export default async function QueuePage() {
  const nextGameTime = getNextGameTime()
  const battleNumber = getBattleNumber()
  const gameDate = formatGameDate()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-yellow-50 to-pink-50">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-yellow-50 to-pink-50/50 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-4 py-6 text-center">
          <div className="flex justify-center mb-3">
            <Logo className="w-32 h-auto" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        <QueuePageClient nextGameTime={nextGameTime} />
      </main>

      {/* Footer - Sticky */}
      <footer className="sticky bottom-0 bg-gradient-to-t from-yellow-50 to-pink-50/50 backdrop-blur-sm border-t border-black/10">
        <div className="max-w-md mx-auto px-4 py-4 text-center text-sm text-gray-600">
          <p>{gameDate}</p>
          <p className="mt-1">Battle-{battleNumber}</p>
        </div>
      </footer>
    </div>
  )
}


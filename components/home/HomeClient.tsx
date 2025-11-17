'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import StatsOverlay from '@/components/stats/StatsOverlay'
import Logo from '@/components/Logo'

const LogoutLink = dynamic(() => import('@/components/LogoutLink'), { ssr: false })

interface HomeClientProps {
  user: {
    id: string
  } | null
}

export default function HomeClient({ user }: HomeClientProps) {
  const [showStats, setShowStats] = useState(false)

  return (
    <>
      <div className="home-shell scanlines">
        <main className="home-main">
          <header className="home-header">
            <Logo className="w-full h-auto block" />
          </header>

          <section className="home-content">
            <div className="home-copy">
              <Image
                src="/skull-signup.png"
                alt="Skull"
                width={49}
                height={48}
                className="mb-4"
              />
              <span className="text-body-large text-[color:var(--color-accent-pink)]">
                Solve 16 anagrams in 8 minutes.
                <br />
                <span className="text-[color:var(--color-accent-yellow)]">Or die.</span>
              </span>
            </div>

            <div className="w-full px-5 flex flex-col gap-[20px]">
              <Link href="/daily" className="btn-primary btn-primary--animated">
                <span className="text-body-medium">Play today&apos;s game</span>
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
          </section>

          <footer className="home-footer">
            <span className="text-info-small text-[color:var(--color-accent-pink)]">
              {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              Battle—0
            </span>
          </footer>
        </main>
      </div>

      <StatsOverlay isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  )
}


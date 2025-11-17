import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, Manrope, Inknut_Antiqua, Rubik } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/auth/SessionProvider'
import ScanlineSpeed from '@/components/ScanlineSpeed'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const inknut = Inknut_Antiqua({
  subsets: ['latin'],
  variable: '--font-inknut',
  display: 'swap',
  weight: ['400','500','600','700','800','900'],
})
const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['400','500','600','700','800','900'],
  style: ['normal', 'italic'],
})
export const metadata: Metadata = {
  title: 'Anagram Royale',
  description: 'Test your wits twice a day with an anagram fight to the death',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${inknut.variable} ${rubik.variable}`}>
      <body className="font-sans">
        <Script
          id="scanline-speed-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const baseHeight = 1000;
                const baseDuration = 30;
                const vh = window.innerHeight || baseHeight;
                const duration = Math.max(20, (vh / baseHeight) * baseDuration);
                const scanlinesDuration = Math.max(6.67, duration / 3);
                document.documentElement.style.setProperty('--scanline-duration', duration + 's');
                document.documentElement.style.setProperty('--scanlines-duration', scanlinesDuration + 's');
              })();
            `,
          }}
        />
        <ScanlineSpeed />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

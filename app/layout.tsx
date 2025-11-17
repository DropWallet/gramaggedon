import type { Metadata } from 'next'
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
        <ScanlineSpeed />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

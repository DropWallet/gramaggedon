'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

interface YellowLinkProps {
  href?: string
  onClick?: () => void
  children: ReactNode
  className?: string
}

export default function YellowLink({ href, onClick, children, className = '' }: YellowLinkProps) {
  // Only apply text-body-medium if text-body-small is not already specified
  const textSizeClass = className.includes('text-body-small') ? '' : 'text-body-medium'
  const baseClasses = `yellow-link ${textSizeClass} text-[color:var(--color-accent-yellow)]`
  const combinedClasses = `${baseClasses} ${className}`

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={combinedClasses}>
      {children}
    </button>
  )
}


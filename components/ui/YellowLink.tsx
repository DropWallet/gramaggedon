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
  const baseClasses = 'yellow-link text-body-medium text-[color:var(--color-accent-yellow)]'
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


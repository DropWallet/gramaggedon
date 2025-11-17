'use client'

import { signOut } from 'next-auth/react'
import YellowLink from '@/components/ui/YellowLink'

export default function LogoutLink() {
  return (
    <YellowLink onClick={() => signOut({ callbackUrl: '/' })}>
      Log out
    </YellowLink>
  )
}

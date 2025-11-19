'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { getStoredSessionId } from '@/lib/anonymous'
import YellowLink from '@/components/ui/YellowLink'
import StaticSkull from '@/components/StaticSkull'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.username) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const sessionId = getStoredSessionId()

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          sessionId: sessionId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error) {
          setErrors({ submit: Array.isArray(data.error) ? data.error[0].message : data.error })
        } else {
          setErrors({ submit: 'Registration failed. Please try again.' })
        }
        setIsLoading(false)
        return
      }

      router.push('/login?registered=true')
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ submit: 'Something went wrong. Please try again.' })
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      console.error('Google sign-up error:', error)
      setErrors({ submit: 'Failed to sign up with Google' })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main relative">
        {/* Skull icon */}
        <div className="absolute top-4 inset-x-0 flex justify-center z-10">
          <Link href="/" className="block">
            <StaticSkull />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          <section className="home-content py-10">
            {/* Title */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-body-medium text-[color:var(--color-accent-pink)]">
                Sign the fuck up.
              </p>
            </div>

            <div className="w-full flex flex-col gap-[20px]">
              {errors.submit && (
                <div className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-200 text-center">{errors.submit}</p>
                </div>
              )}

              {/* Google sign up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isLoading}
                className="btn-tertiary w-full flex items-center justify-center gap-3 rounded-[8px] bg-white py-2.5 px-6 text-body-small text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Image
                  src="/ri_google-fill.svg"
                  alt="Google"
                  width={24}
                  height={24}
                />
                {isGoogleLoading ? 'Signing up...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-px bg-[rgba(255,112,217,0.4)]" />
                <span className="text-body-medium text-[color:var(--color-accent-pink)]">or</span>
                <div className="flex-1 h-px bg-[rgba(255,112,217,0.4)]" />
              </div>

              {/* Form */}
              <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
                <div className="w-full">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-form w-full rounded-[8px] px-4 py-2.5 text-[color:var(--color-accent-pink)] placeholder-[rgba(255,112,217,0.6)] focus:outline-none"
                    placeholder="Email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div className="w-full">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-form w-full rounded-[8px] px-4 py-2.5 text-[color:var(--color-accent-pink)] placeholder-[rgba(255,112,217,0.6)] focus:outline-none"
                    placeholder="Username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-400">{errors.username}</p>
                  )}
                </div>

                <div className="w-full">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-form w-full rounded-[8px] px-4 py-2.5 text-[color:var(--color-accent-pink)] placeholder-[rgba(255,112,217,0.6)] focus:outline-none"
                    placeholder="Password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="btn-primary btn-primary--small disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="text-body-small">
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </span>
                </button>
              </form>

              <YellowLink href="/login" className="mt-2 text-body-small">
                Log in instead
              </YellowLink>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

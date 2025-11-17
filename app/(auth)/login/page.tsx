'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import YellowLink from '@/components/ui/YellowLink'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const registered = searchParams?.get('registered') === 'true'

  useEffect(() => {
    if (registered) {
      // Show success message briefly
      setTimeout(() => {
        router.replace('/login')
      }, 3000)
    }
  }, [registered, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    if (!formData.emailOrUsername || !formData.password) {
      setErrors({ submit: 'Please fill in all fields' })
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setErrors({ submit: 'Invalid email/username or password' })
        setIsLoading(false)
        return
      }

      // Hard navigation to ensure session cookie is read server-side
      window.location.assign('/')

    } catch (error) {
      console.error('Login error:', error)
      setErrors({ submit: 'Something went wrong. Please try again.' })
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      console.error('Google sign-in error:', error)
      setErrors({ submit: 'Failed to sign in with Google' })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="home-shell home-shell--tight scanlines">
      <main className="home-main relative">
        {/* Skull icon */}
        <div className="absolute top-4 inset-x-0 flex justify-center z-10">
          <Link href="/" className="block">
            <Image
              src="/skull-signup.png"
              alt="Skull"
              width={49}
              height={48}
            />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          <section className="home-content py-10">
            {/* Title */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-body-medium text-[color:var(--color-accent-pink)]">
                Log the fuck in.
              </p>
            </div>

            <div className="w-full flex flex-col gap-[20px]">
              {registered && (
                <div className="rounded-md border border-green-500/60 bg-green-500/10 px-4 py-3">
                  <p className="text-sm text-green-200 text-center">
                    Account created successfully! Please log in.
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-200 text-center">{errors.submit}</p>
                </div>
              )}

              {/* Google sign in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="btn-tertiary w-full flex items-center justify-center gap-3 rounded-[8px] bg-white py-2.5 px-6 text-body-small text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Image
                  src="/ri_google-fill.svg"
                  alt="Google"
                  width={24}
                  height={24}
                />
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
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
                    id="emailOrUsername"
                    name="emailOrUsername"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.emailOrUsername}
                    onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                    className="input-form w-full rounded-[8px] px-4 py-2.5 text-[color:var(--color-accent-pink)] placeholder-[rgba(255,112,217,0.6)] focus:outline-none"
                    placeholder="Email or username"
                  />
                </div>

                <div className="w-full">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-form w-full rounded-[8px] px-4 py-2.5 text-[color:var(--color-accent-pink)] placeholder-[rgba(255,112,217,0.6)] focus:outline-none"
                    placeholder="Password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="btn-primary btn-primary--small disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="text-body-small">
                    {isLoading ? 'Logging in...' : 'Log in'}
                  </span>
                </button>
              </form>

              <YellowLink href="/register" className="mt-2 text-body-small">
                Create new account
              </YellowLink>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-pink-50">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

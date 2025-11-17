'use client'

import { useEffect } from 'react'

export default function ScanlineSpeed() {
  useEffect(() => {
    // Calculate animation duration based on viewport height
    // Base duration for 100vh, scales proportionally
    const baseHeight = 1000 // Base viewport height in pixels
    const baseDuration = 30 // Base duration in seconds
    
    const updateScanlineSpeed = () => {
      // Use window.innerHeight or fallback to a reasonable default
      const vh = typeof window !== 'undefined' ? window.innerHeight : baseHeight
      // Scale duration proportionally to height (taller = slower)
      // Ensure minimum duration to prevent too-fast animations
      const duration = Math.max(20, (vh / baseHeight) * baseDuration)
      const scanlinesDuration = Math.max(6.67, duration / 3) // Keep the ratio, minimum ~6.67s
      
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--scanline-duration', `${duration}s`)
        document.documentElement.style.setProperty('--scanlines-duration', `${scanlinesDuration}s`)
      }
    }
    
    // Set initial values immediately
    if (typeof window !== 'undefined') {
      // Run immediately on mount
      updateScanlineSpeed()
      
      // Also run after a tiny delay to ensure it's set (in case of timing issues)
      const timeoutId = setTimeout(updateScanlineSpeed, 0)
      
      // Update on resize
      window.addEventListener('resize', updateScanlineSpeed)
      
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updateScanlineSpeed)
      }
    }
  }, [])
  
  return null
}


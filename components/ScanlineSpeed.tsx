'use client'

import { useEffect } from 'react'

export default function ScanlineSpeed() {
  useEffect(() => {
    // Calculate animation duration based on viewport height
    // Base duration for 100vh, scales proportionally
    const baseHeight = 1000 // Base viewport height in pixels
    const baseDuration = 30 // Base duration in seconds
    
    const updateScanlineSpeed = () => {
      const vh = window.innerHeight
      // Scale duration proportionally to height (taller = slower)
      const duration = (vh / baseHeight) * baseDuration
      const scanlinesDuration = duration / 3 // Keep the ratio
      
      document.documentElement.style.setProperty('--scanline-duration', `${duration}s`)
      document.documentElement.style.setProperty('--scanlines-duration', `${scanlinesDuration}s`)
    }
    
    // Set initial values
    updateScanlineSpeed()
    
    // Update on resize
    window.addEventListener('resize', updateScanlineSpeed)
    
    return () => window.removeEventListener('resize', updateScanlineSpeed)
  }, [])
  
  return null
}


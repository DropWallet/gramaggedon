/**
 * Anonymous Player Management
 * 
 * Handles session-based anonymous players who can register later to claim results
 */

import { SESSION_ID_PREFIX, ANONYMOUS_RESULT_EXPIRY_DAYS } from './game'

/**
 * Generate a unique session ID for anonymous players
 */
export function generateSessionId(): string {
  // Generate a unique ID: anon_ + timestamp + random string
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${SESSION_ID_PREFIX}${timestamp}_${random}`
}

/**
 * Check if a string is a valid session ID
 */
export function isValidSessionId(sessionId: string): boolean {
  return sessionId.startsWith(SESSION_ID_PREFIX)
}

/**
 * Calculate expiry date for anonymous results (1 day from now)
 */
export function getAnonymousResultExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + ANONYMOUS_RESULT_EXPIRY_DAYS)
  return expiry
}

/**
 * Check if an anonymous result has expired
 */
export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date() > expiresAt
}

/**
 * Store session ID in browser localStorage
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('anagram_session_id', sessionId)
  }
}

/**
 * Get session ID from browser localStorage
 */
export function getStoredSessionId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('anagram_session_id')
  }
  return null
}

/**
 * Get or create session ID (for anonymous players)
 */
export function getOrCreateSessionId(): string {
  let sessionId = getStoredSessionId()
  
  if (!sessionId || !isValidSessionId(sessionId)) {
    sessionId = generateSessionId()
    storeSessionId(sessionId)
  }
  
  return sessionId
}

/**
 * Clear session ID (when user registers)
 */
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('anagram_session_id')
  }
}


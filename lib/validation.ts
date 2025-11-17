/**
 * Validation helpers for anonymous players
 */

/**
 * Validate that either userId OR sessionId is provided, but not both
 */
export function validatePlayerIdentifier(userId: string | null, sessionId: string | null): {
  valid: boolean
  error?: string
} {
  if (userId && sessionId) {
    return {
      valid: false,
      error: 'Cannot provide both userId and sessionId'
    }
  }
  
  if (!userId && !sessionId) {
    return {
      valid: false,
      error: 'Must provide either userId or sessionId'
    }
  }
  
  return { valid: true }
}

/**
 * Check if a player identifier represents an anonymous player
 */
export function isAnonymousPlayer(userId: string | null, sessionId: string | null): boolean {
  return !userId && !!sessionId
}

/**
 * Get player identifier for logging/display
 */
export function getPlayerIdentifier(userId: string | null, sessionId: string | null): string {
  if (userId) return `user:${userId}`
  if (sessionId) return `session:${sessionId}`
  return 'unknown'
}


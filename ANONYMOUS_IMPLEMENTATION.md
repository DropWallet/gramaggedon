# Anonymous Players - Implementation Guide

## Overview

Anonymous players can compete without registering. Their results are stored temporarily and can be claimed when they register.

## Database Schema Changes

### GameResult
- `userId` is now nullable
- Added `sessionId` (nullable) for anonymous players
- Added `isAnonymous`, `canBeClaimed`, `expiresAt` fields
- Unique constraints on both `[gameId, userId]` and `[gameId, sessionId]`

### GameQueue
- `userId` is now nullable
- Added `sessionId` (nullable) for anonymous players
- Unique constraints on both `[gameId, userId]` and `[gameId, sessionId]`

### Important Notes:
- **Either** `userId` OR `sessionId` must be set (not both, not neither)
- Application-level validation ensures this (see `lib/validation.ts`)
- PostgreSQL allows multiple NULLs in unique constraints, so we need app-level checks

## Flow

### 1. Anonymous Player Joins Game
```
User clicks "Play as Guest"
  → Generate/get sessionId from localStorage
  → Join queue with sessionId (no userId)
  → Play game
  → Results saved with sessionId, isAnonymous=true, expiresAt=+1 day
```

### 2. After Game
```
Show results
  → Display "Register to save your results" prompt
  → Session ID stored in localStorage
```

### 3. User Registers
```
User registers account
  → Get sessionId from localStorage
  → Call claimAnonymousResults(userId, sessionId)
  → Update all GameResults: sessionId → userId, isAnonymous=false
  → Update user stats
  → Clear sessionId from localStorage
```

## Implementation Checklist

### Frontend
- [ ] "Play as Guest" button on home page
- [ ] Session ID management (generate, store, retrieve)
- [ ] Show "Register to save results" after anonymous game
- [ ] Handle registration flow with automatic claiming

### Backend
- [ ] API endpoints accept either userId or sessionId
- [ ] Validation: ensure only one is provided
- [ ] Queue joining with sessionId
- [ ] Game result creation with sessionId
- [ ] Registration endpoint calls claimAnonymousResults()
- [ ] Background job to cleanup expired results

### Database
- [ ] Run migration to update schema
- [ ] Test unique constraints work correctly
- [ ] Verify indexes are created

## API Endpoints Needed

### Join Queue (Anonymous)
```typescript
POST /api/games/:id/queue
Body: { sessionId: string }
// OR for registered users:
Body: { userId: string }
```

### Register & Claim
```typescript
POST /api/auth/register
Body: { email, username, password }
// Automatically claims results using sessionId from localStorage
Response: { userId, claimedResultsCount }
```

## Background Jobs

### Cleanup Expired Results
Run daily to delete anonymous results that expired:
```typescript
import { cleanupExpiredAnonymousResults } from '@/lib/claim-results'

// Run daily
const deletedCount = await cleanupExpiredAnonymousResults()
```

## Testing Considerations

1. **Session ID Persistence**: Test localStorage across page refreshes
2. **Expiry**: Test results expire after 1 day
3. **Claiming**: Test automatic claiming on registration
4. **Unique Constraints**: Test can't join same game twice with same session
5. **Stats**: Test user stats update correctly after claiming

## Edge Cases

1. **User clears localStorage before registering**: Results lost (acceptable)
2. **User registers on different device**: Can't claim (acceptable, results expire)
3. **Multiple anonymous games before registering**: All claimed at once
4. **User already registered tries to play as guest**: Show logged-in UI

## Security Considerations

1. **Session ID Format**: Use prefix to identify anonymous sessions
2. **Rate Limiting**: Apply same rate limits to anonymous players
3. **Validation**: Always validate sessionId format
4. **Expiry**: Enforce expiry to prevent database bloat


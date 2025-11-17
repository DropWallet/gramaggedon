# Anonymous Player System - Design Options

## Overview
Allow non-registered players to compete anonymously, with the option to register after the game to save their results.

## Option A: Session-Based Anonymous Players (Recommended)

### How it works:
- Anonymous players get a temporary session ID (stored in browser/localStorage)
- Game results stored with `userId = null` and `sessionId = "session_xxx"`
- After game, show "Register to save your results" prompt
- If they register, link the session ID to their new account
- Anonymous results kept for 7-30 days, then deleted

### Database Changes:
```prisma
model GameResult {
  // ... existing fields
  userId        String?  // Make nullable
  sessionId     String?  // Temporary session identifier
  isAnonymous   Boolean  @default(false)
  canBeClaimed  Boolean  @default(true)  // Can be claimed by registering
  expiresAt     DateTime?  // When to delete if not claimed
}
```

### Pros:
✅ Simple to implement
✅ No account needed to play
✅ Easy to claim results (just match sessionId)
✅ Can show "Register to save" prompt after game
✅ Works well with localStorage/sessionStorage

### Cons:
⚠️ Results lost if they clear browser data before registering
⚠️ Need cleanup job to delete expired anonymous results
⚠️ Session ID could be shared (but results aren't valuable until claimed)

### Implementation:
1. Generate session ID on first visit (store in localStorage)
2. Use session ID for anonymous players
3. After game, show registration prompt with session ID
4. On registration, query for `sessionId` and update `userId`
5. Background job deletes unclaimed results after expiry

---

## Option B: Email-Based Anonymous Players

### How it works:
- Anonymous players provide email (optional) before playing
- Game results stored with email but no userId
- After game, send email with "Claim your results" link
- Registration links email to account, claims all results with that email

### Database Changes:
```prisma
model GameResult {
  // ... existing fields
  userId        String?
  anonymousEmail String?  // Email for anonymous players
  isAnonymous   Boolean  @default(false)
  canBeClaimed  Boolean  @default(true)
  expiresAt     DateTime?
}
```

### Pros:
✅ Results persist even if browser data cleared
✅ Can send reminder emails
✅ Can claim results from any device
✅ Better for user retention

### Cons:
⚠️ Requires email input (friction)
⚠️ Email validation needed
⚠️ More complex flow
⚠️ Privacy concerns (collecting email without account)

### Implementation:
1. Optional email input before joining queue
2. Store email with game results
3. After game, send email with claim link
4. Registration/claim process links email to account

---

## Option C: Hybrid Approach (Best UX)

### How it works:
- Start with session-based (no friction)
- After game, offer to save with email (optional)
- If they provide email, store it and send claim link
- If they register immediately, claim by session ID
- If they register later, claim by email

### Database Changes:
```prisma
model GameResult {
  // ... existing fields
  userId        String?
  sessionId     String?
  anonymousEmail String?
  isAnonymous   Boolean  @default(false)
  canBeClaimed  Boolean  @default(true)
  expiresAt     DateTime?
  
  @@index([sessionId])
  @@index([anonymousEmail])
}
```

### Pros:
✅ No friction to start playing
✅ Option to save with email (persistent)
✅ Multiple ways to claim (session or email)
✅ Best of both worlds

### Cons:
⚠️ Most complex to implement
⚠️ Need to handle both session and email flows

---

## Recommendation: Option A (Session-Based) with Email Option

**Why:**
- Lowest friction (no email required to play)
- Simple implementation
- Good enough for most cases
- Can add email option later if needed

**Flow:**
1. User visits site → Generate session ID → Store in localStorage
2. User joins queue as anonymous (no registration needed)
3. Play game → Results saved with sessionId
4. After game → Show results + "Register to save" button
5. If they register → Link sessionId to new userId
6. If they don't → Results expire after 7 days

---

## Database Schema Changes Needed

### Option A (Recommended):

```prisma
model GameResult {
  // ... existing fields
  userId        String?  // Make nullable
  sessionId     String?  // For anonymous players
  isAnonymous   Boolean  @default(false)
  canBeClaimed  Boolean  @default(true)
  expiresAt     DateTime?  // Auto-delete after 7 days if not claimed
  
  // ... rest of fields
  
  @@index([sessionId])
  @@index([expiresAt])  // For cleanup job
}

model GameQueue {
  // ... existing fields
  userId        String?  // Make nullable
  sessionId     String?  // For anonymous players
  
  @@unique([gameId, userId, sessionId])  // Need to adjust unique constraint
}
```

### Considerations:
- Need to adjust unique constraints (can't use userId alone)
- Need cleanup job for expired anonymous results
- Need to handle anonymous players in friend comparisons (skip them)
- World rankings only include registered users

---

## Implementation Questions:

1. **Session ID Format**: 
   - UUID? 
   - `anon_` prefix?
   - How long? (affects storage)

2. **Expiry Time**: 
   - 7 days? 
   - 30 days?
   - Configurable?

3. **UI Flow**:
   - Show "Play as Guest" button?
   - Always allow anonymous, prompt after?
   - How prominent is "Register to save"?

4. **Claiming Results**:
   - Automatic on registration?
   - Manual "Claim my results" button?
   - Both?

5. **Anonymous Player Limits**:
   - Can they add friends? (No)
   - Can they see leaderboards? (Yes, but not ranked)
   - Can they play premium features? (No)

---

## My Recommendation:

**Go with Option A (Session-Based)** because:
- ✅ Achievable and not too complicated
- ✅ Low friction (no email required)
- ✅ Good UX (play immediately, save later)
- ✅ Can enhance later with email option

**Key Implementation Points:**
1. Make `userId` nullable in GameResult and GameQueue
2. Add `sessionId` field
3. Generate session ID on first visit
4. Show "Register to save" prompt after game
5. Auto-claim results on registration (match sessionId)
6. Background job to clean up expired results

**Complexity Level:** Medium (manageable, adds some complexity but worth it for UX)

What do you think? Should we go with Option A, or do you prefer one of the other approaches?


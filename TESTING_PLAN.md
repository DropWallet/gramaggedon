# Testing Plan & Next Steps

## Current Status

### ✅ Completed
- Authentication (email/password + Google OAuth)
- Queue system (join/leave, status)
- Game scheduler (Vercel Cron for 8:00 UTC and 17:00 UTC)
- Game engine (start games, pre-generate anagrams)
- Round progression logic (eliminations, final round winner)
- Submission API (validate answers, rate limiting)
- Game UI (anagram display, answer input, timer, error states)
- Round transitions (15-second countdown between rounds)
- Player status indicators (round number, remaining players)

### ⚠️ Partially Complete
- **Round Timer Processing**: Logic exists but needs automatic execution
- **Word List**: Currently using placeholder anagrams (need real word list)

### ❌ Not Started
- WebSocket/real-time updates (currently using 2-second polling)
- Results page (after game ends)
- User dashboard with stats
- Round timer scheduler (automatically process round ends)

---

## Testing Strategy

### Option A: Manual Testing Endpoints (Recommended for Development)

Create admin/testing endpoints to:
1. **Manually start a game** - `/api/test/start-game`
2. **Manually advance a round** - `/api/test/advance-round`
3. **Manually end a round** - `/api/test/end-round`
4. **Reset game state** - `/api/test/reset`

**Pros:**
- Fast iteration during development
- No need to wait for scheduled times
- Can test edge cases easily
- Can simulate multiple players

**Cons:**
- Need to protect with dev-only access
- Not testing real scheduler behavior

### Option B: Dev Mode with Short Timers

Create a development mode that:
- Uses 5-second rounds instead of 60 seconds
- Uses 2-second countdowns instead of 15 seconds
- Allows immediate game start

**Pros:**
- Tests real timer logic
- More realistic flow

**Cons:**
- Still need to wait for timers
- Harder to test specific scenarios

### Option C: Hybrid Approach (Best)

Combine both:
- Manual endpoints for quick testing
- Dev mode with short timers for realistic testing
- Production mode with full timers

---

## Immediate Next Steps

### 1. Create Testing Endpoints (Priority 1)
**Files to create:**
- `app/api/test/start-game/route.ts` - Manually start a game
- `app/api/test/advance-round/route.ts` - Manually advance to next round
- `app/api/test/end-round/route.ts` - Manually end current round
- `app/api/test/reset/route.ts` - Clear all test data

**Protection:**
- Check for `NODE_ENV === 'development'` or use a test secret
- Add `TEST_SECRET` env variable

### 2. Round Timer Scheduler (Priority 2)
**Problem:** Rounds need to automatically end when timer expires, but currently only processes on submission.

**Solution:** Create a background job/cron that:
- Checks for active games every 5 seconds
- Calls `checkRoundEnd()` and `processRoundEnd()` if needed
- Can use Vercel Cron or a simple interval

**Files to create:**
- `app/api/cron/round-processor/route.ts` - Called every 5 seconds
- Or use a server-side interval in development

### 3. Results Page (Priority 3)
**What's needed:**
- Display final game results
- Show winner, rankings, player stats
- Link to claim results for anonymous users

**Files to create:**
- `app/game/result/page.tsx` - Results page
- `app/api/game/result/route.ts` - Fetch game results

### 4. Word List Integration (Priority 4)
**Current:** Using placeholder anagrams
**Needed:** Real word list with valid anagrams

**Options:**
- Use a word list API
- Include a word list file (JSON/CSV)
- Generate from a dictionary

---

## Testing Workflow

### Step 1: Manual Game Start
```bash
# In browser console or via curl
fetch('/api/test/start-game', { method: 'POST' })
```

### Step 2: Join Queue (as multiple users)
- Open multiple browser windows/incognito tabs
- Join queue in each
- Start game manually

### Step 3: Test Submissions
- Submit correct answers
- Submit wrong answers (test error banner)
- Test backspace/delete
- Test rate limiting

### Step 4: Test Round Progression
- Manually advance rounds
- Test eliminations
- Test final round winner logic

### Step 5: Test Round Transitions
- Verify 15-second countdown appears
- Test automatic round start

---

## Recommended Implementation Order

1. **Testing endpoints** (30 min) - Enable rapid testing
2. **Round timer scheduler** (1 hour) - Make rounds actually end automatically
3. **Results page** (1 hour) - Complete game flow
4. **Word list** (30 min) - Replace placeholders
5. **WebSocket updates** (2-3 hours) - Real-time instead of polling
6. **User dashboard** (2-3 hours) - Stats and history

---

## Quick Start Testing Commands

After implementing testing endpoints:

```bash
# 1. Start dev server
npm run dev

# 2. In browser console (on homepage):
# Join queue
fetch('/api/queue/join', { method: 'POST', credentials: 'include' })

# 3. In another tab/terminal:
# Start game manually
curl -X POST http://localhost:3000/api/test/start-game

# 4. Navigate to /game and test!
```

---

## Questions to Consider

1. **Word List Source**: Where should we get the word list?
   - Include in repo?
   - External API?
   - Generate programmatically?

2. **Round Timer**: How should we handle automatic round endings?
   - Vercel Cron (5-second intervals - might be too frequent)
   - Server-side interval (only works in long-running processes)
   - Client-side polling + server check (current approach)

3. **Testing Protection**: How to protect test endpoints?
   - Environment variable check
   - Secret token
   - IP whitelist
   - All of the above?


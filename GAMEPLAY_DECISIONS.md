# Core Gameplay Decisions - Database Impact

Before finalizing the database schema, we need to decide on these gameplay mechanics. Each decision affects what data we need to store and how the system works.

## 1. Game Joining & Queue System

**Question:** How do players join games?

### Option A: Pre-registration Queue
- Players join a queue before the scheduled game time (e.g., 15 minutes before)
- Game starts automatically at scheduled time with all queued players
- **Pros:**
  - Predictable start time
  - Can show player count before start
  - Better for planning
- **Cons:**
  - Requires players to be online early
  - May have no-shows

### Option B: Join Window
- Players can join during a window (e.g., 9:00-9:05 AM)
- Game starts when window closes or minimum players reached
- **Pros:**
  - More flexible for players
  - Can start early if enough players
- **Cons:**
  - Less predictable timing
  - Late joiners might miss first round

### Option C: Instant Start
- Game starts immediately when first player joins
- Others can join for a short period (e.g., 30 seconds)
- **Pros:**
  - Fastest start
  - No waiting
- **Cons:**
  - Unpredictable
  - Might start with very few players

**Your choice:** [ ]

---

## 2. Minimum Players to Start

**Question:** How many players are required to start a game?

### Option A: No minimum (1+)
- Game can start with any number of players
- **Pros:**
  - Always runs on schedule
  - No frustration from cancelled games
- **Cons:**
  - Less competitive with few players
  - May feel empty

### Option B: Small minimum (2-3)
- Need at least 2-3 players
- **Pros:**
  - Some competition
  - Still runs most of the time
- **Cons:**
  - Games might not start if low participation

### Option C: Larger minimum (5-10)
- Need minimum for competitive experience
- **Pros:**
  - More exciting games
  - Better battle royale feel
- **Cons:**
  - More games cancelled
  - Frustrating for players

**Your choice:** [ ]

---

## 3. Anagram Generation

**Question:** Are anagrams the same for all players or different?

### Option A: Same Anagram for All
- Everyone sees the same scrambled letters
- **Pros:**
  - Fair competition
  - Can compare solutions
  - Simpler to implement
- **Cons:**
  - Players might share answers
  - Less variety

### Option B: Different Anagrams, Same Word
- Same target word, different scrambles
- **Pros:**
  - Prevents answer sharing
  - Still fair (same difficulty)
- **Cons:**
  - More complex
  - Harder to verify fairness

### Option C: Different Words, Same Length
- Each player gets different word of same length
- **Pros:**
  - Maximum variety
  - No answer sharing possible
- **Cons:**
  - Hard to ensure equal difficulty
  - Less "shared experience"

**Your choice:** [ ]

---

## 4. Submission & Elimination Timing

**Question:** When are players eliminated?

### Option A: Instant Elimination
- Eliminated immediately upon wrong answer or timeout
- **Pros:**
  - Clear and immediate feedback
  - Simple logic
- **Cons:**
  - Harsh for close calls
  - No recovery

### Option B: End of Round Elimination
- All submissions collected, then eliminations processed
- **Pros:**
  - Can handle ties better
  - More strategic (can see others' status)
- **Cons:**
  - More complex
  - Delayed feedback

### Option C: Grace Period
- Wrong answer = warning, timeout = elimination
- Multiple wrong answers needed to eliminate
- **Pros:**
  - More forgiving
  - Reduces frustration
- **Cons:**
  - Less competitive
  - Complicates scoring

**Your choice:** [ ]

---

## 5. Disconnection Handling

**Question:** What happens if a player disconnects mid-game?

### Option A: Instant Elimination
- Disconnect = automatic elimination
- **Pros:**
  - Simple
  - Prevents abuse
- **Cons:**
  - Harsh for network issues
  - Frustrating

### Option B: Reconnection Window
- Can rejoin within X seconds (e.g., 30 seconds)
- Missed rounds count as failures
- **Pros:**
  - More forgiving
  - Better UX
- **Cons:**
  - More complex to implement
  - Potential for abuse

### Option C: Auto-submit Empty
- Disconnected players auto-submit empty/incorrect
- Can rejoin but already eliminated
- **Pros:**
  - Game continues smoothly
  - Clear consequences
- **Cons:**
  - Still harsh for network issues

**Your choice:** [ ]

---

## 6. Round Timing

**Question:** How is time managed?

### Option A: Server-Side Timer Only
- Server controls all timing
- Clients sync to server
- **Pros:**
  - Prevents cheating
  - Accurate timing
- **Cons:**
  - Requires constant connection
  - More server load

### Option B: Client-Side with Server Validation
- Client shows timer, server validates
- **Pros:**
  - Better UX (smooth countdown)
  - Less server load
- **Cons:**
  - Potential for client manipulation
  - Need validation logic

### Option C: Hybrid
- Server sends start time, client calculates
- Server validates submission time
- **Pros:**
  - Balance of UX and security
- **Cons:**
  - More complex

**Your choice:** [ ]

---

## 7. Tie Handling

**Question:** What happens if multiple players submit correct answers simultaneously?

### Option A: All Advance
- All correct answers advance
- **Pros:**
  - Simple
  - Fair
- **Cons:**
  - No differentiation

### Option B: Speed Matters
- Fastest correct answer wins the round
- Others advance but ranked by speed
- **Pros:**
  - Adds skill element
  - More competitive
- **Cons:**
  - Network latency affects fairness
  - More complex ranking

### Option C: Round Winner + Others Advance
- Fastest = "round winner" (bonus points?)
- Others just advance
- **Pros:**
  - Rewards speed without harsh elimination
- **Cons:**
  - Need to track round winners

**Your choice:** [ ]

---

## 8. Game End Conditions

**Question:** When does a game end?

### Option A: Last Player Standing
- Game continues until one player remains
- **Pros:**
  - Classic battle royale
  - Clear winner
- **Cons:**
  - Could be very long
  - Might have many rounds

### Option B: All Fail Round
- Game ends when all remaining players fail a round
- **Pros:**
  - Natural difficulty curve
  - Prevents extremely long games
- **Cons:**
  - Might end with no winner
  - Less satisfying

### Option C: Max Rounds + Winner
- Game ends at max rounds (e.g., 10)
- Winner is highest ranked at that point
- **Pros:**
  - Predictable duration
  - Always has winner
- **Cons:**
  - Might feel arbitrary
  - Less dramatic

### Option D: Hybrid
- Game ends when one player remains OR all fail OR max rounds reached
- **Pros:**
  - Flexible
  - Covers all scenarios
- **Cons:**
  - More complex logic

**Your choice:** [ ]

---

## 9. Late Joiners

**Question:** Can players join after a game has started?

### Option A: No Late Joining
- Must join before game starts
- **Pros:**
  - Fair for all players
  - Simpler
- **Cons:**
  - Missed opportunity if late

### Option B: Join Until Round X
- Can join until round 2 or 3
- Start with penalty (e.g., one strike)
- **Pros:**
  - More flexible
  - Better for engagement
- **Cons:**
  - Unfair advantage/disadvantage
  - Complex to implement

**Your choice:** [ ]

---

## 10. Practice Mode

**Question:** Should there be a practice/solo mode?

### Option A: No Practice Mode
- Only scheduled competitive games
- **Pros:**
  - Focused experience
  - Simpler
- **Cons:**
  - No way to learn/improve
  - Higher barrier to entry

### Option B: Unlimited Practice
- Can play solo anytime with same mechanics
- **Pros:**
  - Great for learning
  - Lower barrier to entry
- **Cons:**
  - Might reduce competitive participation
  - Need separate tracking

### Option C: Limited Practice
- X practice games per day
- **Pros:**
  - Balance of learning and competition
- **Cons:**
  - Arbitrary limit
  - More complex

**Your choice:** [ ]

---

## 11. Data Tracking for Premium Features

**Question:** What detailed stats should we track for premium users?

### Options to consider:
- [ ] Time per round (millisecond precision)
- [ ] Attempts per round (if multiple attempts allowed)
- [ ] Comparison with friends (round-by-round)
- [ ] Historical performance trends
- [ ] Difficulty analysis (which lengths are hardest)
- [ ] Time of day performance
- [ ] Win/loss breakdowns
- [ ] Rivalry tracking (head-to-head with specific friends)

**Your choices:** [ ]

---

## 12. Friend Comparisons

**Question:** How should friend comparisons work?

### Option A: Same Game Only
- Only compare if both played same game
- **Pros:**
  - Direct comparison
  - Fair
- **Cons:**
  - Limited comparison opportunities

### Option B: Historical Comparison
- Compare overall stats across all games
- **Pros:**
  - Always available
  - More data points
- **Cons:**
  - Less meaningful (different games)

### Option C: Both
- Show same-game when available, historical otherwise
- **Pros:**
  - Best of both
- **Cons:**
  - More complex UI

**Your choice:** [ ]

---

## Next Steps

Once you've made these decisions, I'll:
1. Update the database schema accordingly
2. Adjust the game logic to match
3. Plan the implementation details

Please fill in your choices above, and we can discuss any that need clarification!


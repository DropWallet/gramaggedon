# Finalized Game Design Decisions

This document summarizes all finalized decisions for the Anagram Battle Royale game.

## ✅ Core Gameplay Mechanics

### 1. Queue System
- **Type**: Pre-registration queue
- **Queue Opens**: 15 minutes before scheduled game time
- **Queue Closes**: At scheduled game start time
- **Minimum Players**: None (game can start with any number)

### 2. Anagram Generation
- **Type**: Same anagram for all players
- **Storage**: `GameAnagram` model stores one anagram per round
- **Fairness**: All players see identical scrambled letters

### 3. Submission System
- **Multiple Attempts**: Yes, players can submit multiple answers per round
- **Rate Limiting**: Maximum 1 submission per second
- **Validation**: Server-side validation of rate limits
- **Tracking**: Every attempt stored in `SubmissionAttempt` table

### 4. Elimination System
- **Timing**: End of round (not instant)
- **Rule**: All players with at least one correct answer advance
- **Process**: Round ends → evaluate all submissions → eliminate those without correct answer
- **Tracking**: `RoundResult.isEliminated` set at round end

### 5. Reconnection Handling
- **Window**: 20 seconds to reconnect
- **Rule**: If round ends before reconnection, player is eliminated
- **Tracking**: `GameResult.disconnectedAt`, `reconnectedAt`, `isDisconnected`

### 6. Round Timing
- **Countdown Between Rounds**: 15 seconds (gives players a breather and builds anticipation)
- **Next Round**: Starts after 15-second countdown completes
- **Timer**: Client-side countdown, server-side validation
- **Storage**: `GameAnagram.roundStartedAt` and `roundEndedAt`
- **Flow**: Round ends → 15 second countdown → Next round starts

### 7. Tie Handling
- **Rule**: All correct answers advance (no speed-based elimination)
- **Stats**: Speed still tracked for premium analytics
- **Ranking**: Speed used for stats, not elimination

### 8. Game End Conditions
Game ends when ANY of these occur:
1. One player remains (winner declared)
2. All players fail a round (no winner)
3. Maximum rounds reached (winner is highest ranked)

### 9. Late Joining
- **Rule**: No late joining allowed
- **Enforcement**: Queue closes at game start time
- **Tracking**: `GameQueue.leftAt` tracks if player left before start

### 10. Practice Mode
- **Rule**: No practice mode (all games are competitive)
- **Rationale**: Focus on scheduled competitive games only

### 11. Anonymous Players
- **Type**: Session-based anonymous players
- **Session ID**: Generated and stored in localStorage
- **UI**: "Play as Guest" button available
- **Results**: Stored with `sessionId` instead of `userId`
- **Expiry**: Anonymous results expire after 1 day if not claimed
- **Claiming**: Automatic on registration (matches sessionId)
- **Tracking**: Results not tracked in user stats until claimed

## ✅ Premium Features & Analytics

### Data Points Tracked:
1. ✅ Time per round (millisecond precision)
2. ✅ Attempts per round (all attempts logged)
3. ✅ Comparison with friends (same-game + historical)
4. ✅ Historical performance trends
5. ✅ Difficulty analysis (by word length)
6. ✅ Time of day performance (morning vs evening)
7. ✅ Win/loss breakdowns
8. ✅ Rivalry tracking (head-to-head with friends)
9. ✅ Consecutive days played
10. ✅ Average rounds completed
11. ✅ World rank

### Friend Comparisons
- **Type**: Both same-game and historical
- **Storage**: `FriendComparison` model
- **Same-Game**: `sharedGameIds` array tracks games both played
- **Historical**: Cached stats (`headToHeadWins`, `averageRoundsDifference`, etc.)

## ✅ World Ranking System

### Formula:
```
score = (winRate * 0.4) + (avgRounds * 0.3) + (totalWins * 0.2) + (consistency * 0.1)
```

### Components:
- **Win Rate** (40%): `totalWins / totalGames`
- **Average Rounds** (30%): Normalized to 0-1 (max 10 rounds)
- **Total Wins** (20%): Log scale normalization
- **Consistency** (10%): Based on standard deviation of rounds completed

### Requirements:
- Minimum 5 games to be ranked
- Rank cached in `User.worldRank`
- Recalculated periodically (background job)

## ✅ Database Schema Summary

### New Models:
1. `GameQueue` - Pre-registration queue
2. `GameAnagram` - Anagram per round (same for all)
3. `SubmissionAttempt` - Every submission (rate limited)
4. `FriendComparison` - Friend stats and comparisons

### Enhanced Models:
1. `User` - Added ranking, streaks, stats
2. `Game` - Added queue timing, anagram storage
3. `GameResult` - Added disconnection tracking
4. `RoundResult` - Redesigned for end-of-round elimination

### Key Fields:
- `Game.queueOpensAt` - 15 minutes before scheduled time
- `GameAnagram.roundStartedAt/roundEndedAt` - Round timing
- `GameResult.disconnectedAt/reconnectedAt` - Reconnection tracking
- `SubmissionAttempt.submittedAt` - Precise timestamps
- `User.worldRank` - Cached ranking
- `User.consecutiveDaysPlayed` - Daily streak

## ✅ Configuration Constants

```typescript
QUEUE_OPEN_MINUTES_BEFORE = 15
RECONNECTION_WINDOW_SECONDS = 20
SUBMISSION_RATE_LIMIT_MS = 1000  // 1 per second
MIN_GAMES_FOR_RANKING = 5
ROUND_COUNTDOWN_SECONDS = 15  // Countdown between rounds
ANONYMOUS_RESULT_EXPIRY_DAYS = 1  // Anonymous results expire after 1 day
SESSION_ID_PREFIX = 'anon_'  // Prefix for anonymous session IDs
```

## ✅ Round Progression (Gradual Config)

| Round | Letters | Time (seconds) |
|-------|---------|----------------|
| 1     | 5       | 60             |
| 2     | 6       | 55             |
| 3     | 7       | 50             |
| 4     | 8       | 45             |
| 5     | 9       | 40             |
| 6     | 10      | 35             |
| 7     | 11      | 30             |
| 8     | 12      | 25             |
| 9     | 13      | 20             |
| 10    | 14      | 15             |

**Formula:**
- Length: `5 + (round - 1)` (starts at 5 letters)
- Time: `max(15, 60 - (round - 1) * 5)` (minimum 15 seconds)

## ✅ Next Steps

1. **Review Schema**: Final check of database structure
2. **Run Migrations**: `npx prisma migrate dev`
3. **Implement Game Logic**: Build round progression, elimination, etc.
4. **Build API Endpoints**: Queue, submission, game state
5. **Real-time System**: WebSocket implementation
6. **UI Components**: Game interface, queue, results

## 📝 Notes

- All decisions are now finalized and reflected in the codebase
- Schema is ready for migration
- Game logic functions are in place
- Configuration constants are defined
- Ready to begin implementation


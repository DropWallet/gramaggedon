# Database Schema - Decision Mapping

This document explains how the database schema maps to your gameplay decisions.

## Decision 1: Pre-registration Queue (Option A) ✅

**Implementation:**
- `GameQueue` model tracks players joining before game starts
- `Game.queueOpensAt` - when queue opens (e.g., 15 min before scheduled time)
- `GameStatus.QUEUE_OPEN` - status when players can join
- Players can leave queue (`GameQueue.leftAt`)

**Database Impact:**
- New `GameQueue` table
- `Game` model has `queueOpensAt` field
- New `QUEUE_OPEN` status

---

## Decision 2: No Minimum Players (Option A) ✅

**Implementation:**
- No database constraint needed
- Logic handled in application code
- Game can start with any number of players (even 1)

**Database Impact:**
- None - handled in application logic

---

## Decision 3: Same Anagram for All (Option A) ✅

**Implementation:**
- `GameAnagram` model stores the anagram for each round
- Same `anagram` and `solution` shown to all players
- One `GameAnagram` per round per game

**Database Impact:**
- New `GameAnagram` table
- Stores: `anagram` (scrambled), `solution` (correct word), `timeSeconds` (time limit)

---

## Decision 4: End of Round Elimination + Multiple Attempts (Option B) ✅

**Implementation:**
- `SubmissionAttempt` - tracks EVERY submission (allows spam)
- `RoundResult` - tracks final status at end of round
- `RoundResult.isEliminated` - set at end of round
- `RoundResult.totalAttempts` - count of all attempts
- `RoundResult.correctAttempts` - count of correct attempts

**Database Impact:**
- New `SubmissionAttempt` table (one row per attempt)
- `RoundResult` tracks final round status
- Can have many `SubmissionAttempt` records per `RoundResult`

---

## Decision 5: Reconnection Window (Option B) ✅

**Implementation:**
- `GameResult.disconnectedAt` - when player disconnected
- `GameResult.reconnectedAt` - when player reconnected
- `GameResult.isDisconnected` - current connection status
- Application logic handles reconnection window (e.g., 30 seconds)

**Database Impact:**
- Added fields to `GameResult` model
- Logic handled in application code

---

## Decision 6: Client-Side Timer with Server Validation (Option B) ✅

**Implementation:**
- `SubmissionAttempt.submittedAt` - precise server timestamp
- `SubmissionAttempt.timeSinceRoundStart` - milliseconds since round started
- Server validates submission time against round start time
- Client shows timer, server validates

**Database Impact:**
- `SubmissionAttempt` stores precise timestamps
- Index on `[roundNumber, submittedAt]` for speed ranking queries

---

## Decision 7: All Correct Answers Advance (Option A) ✅

**Implementation:**
- `RoundResult.isEliminated` - only false if they submitted correct answer
- All players with correct answer advance
- `RoundResult.firstCorrectSubmissionAt` - tracks when they first got it right (for stats)

**Database Impact:**
- `RoundResult` tracks if eliminated
- `firstCorrectSubmissionAt` for premium stats

---

## Decision 8: Hybrid Game End (Option D) ✅

**Implementation:**
- Game ends when:
  - One player remains (`GameResult.isWinner = true` for that player)
  - All players fail a round (all `RoundResult.isEliminated = true`)
  - Max rounds reached (`Game.currentRound >= Game.maxRounds`)
- `Game.status = COMPLETED` when any condition met

**Database Impact:**
- `Game.maxRounds` field
- `Game.currentRound` tracks progress
- `GameResult.isWinner` marks winner
- Logic handled in application code

---

## Decision 9: No Late Joining (Option A) ✅

**Implementation:**
- `GameQueue` only allows joining before `Game.scheduledAt`
- Once game starts, no new players can join
- `GameQueue.leftAt` is null if they stayed in queue

**Database Impact:**
- `GameQueue` model enforces this
- Application logic prevents late joining

---

## Decision 10: No Practice Mode (Option A) ✅

**Implementation:**
- All games are competitive
- No separate practice game type
- All `GameResult` records are real games

**Database Impact:**
- None - no practice mode needed

---

## Decision 11: All Premium Data Points ✅

**Implementation:**

### Time per Round
- `SubmissionAttempt.submittedAt` - precise timestamp
- `SubmissionAttempt.timeSinceRoundStart` - milliseconds
- Can calculate time per round from this

### Attempts per Round
- `RoundResult.totalAttempts` - total attempts
- `RoundResult.correctAttempts` - correct attempts
- Query `SubmissionAttempt` for detailed breakdown

### Comparison with Friends
- `FriendComparison` model tracks this
- `sharedGameIds` - games both played
- `headToHeadWins/Losses/Ties` - direct comparisons

### Historical Performance Trends
- Query `GameResult` over time
- `User.averageRoundsCompleted` - cached average
- Can calculate trends from historical data

### Difficulty Analysis
- `GameAnagram` stores word length per round
- `SubmissionAttempt` shows success rate by length
- Can analyze which lengths are hardest

### Time of Day Performance
- `Game.gameType` (MORNING/EVENING)
- `GameResult` linked to game type
- Can analyze performance by time of day

### Win/Loss Breakdowns
- `User.totalWins` / `User.totalGames`
- `GameResult.isWinner`
- Can calculate win rate

### Rivalry Tracking
- `FriendComparison` model
- `headToHeadWins/Losses`
- Tracks specific friend rivalries

### Consecutive Days Played
- `User.consecutiveDaysPlayed` - current streak
- `User.longestConsecutiveDays` - best streak
- `User.lastPlayedDate` - for calculation

### Average Rounds Completed
- `User.averageRoundsCompleted` - cached
- `GameResult.roundsCompleted` - per game
- Can recalculate from historical data

### World Rank
- `User.worldRank` - cached rank
- `User.worldRankUpdatedAt` - when last calculated
- Calculated from overall performance metrics

**Database Impact:**
- Added fields to `User` model
- `FriendComparison` model for friend stats
- `SubmissionAttempt` for detailed round data
- Indexes for performance queries

---

## Decision 12: Both Same-Game and Historical Comparison (Option C) ✅

**Implementation:**
- `FriendComparison.sharedGameIds` - array of game IDs where both played
- `FriendComparison.headToHeadWins/Losses/Ties` - same-game stats
- `FriendComparison.averageRoundsDifference` - historical comparison
- `FriendComparison.winRateDifference` - historical comparison
- Application can show same-game when available, historical otherwise

**Database Impact:**
- `FriendComparison` model supports both
- `sharedGameIds` array for same-game tracking
- Historical stats as computed fields

---

## Summary of Schema Changes

### New Models:
1. `GameQueue` - Pre-registration queue
2. `GameAnagram` - Anagram for each round
3. `SubmissionAttempt` - Every submission attempt
4. `FriendComparison` - Friend comparison stats

### Modified Models:
1. `User` - Added stats fields (consecutive days, world rank, avg rounds)
2. `Game` - Added `queueOpensAt`, `anagrams` relation
3. `GameResult` - Added disconnection tracking
4. `RoundResult` - Changed to track final status, not just one submission

### New Enums:
- `GameStatus.QUEUE_OPEN` - New status

### Key Indexes:
- `SubmissionAttempt[gameResultId, roundNumber]` - Fast round queries
- `SubmissionAttempt[roundNumber, submittedAt]` - Speed ranking
- `GameQueue[gameId, joinedAt]` - Queue ordering
- `FriendComparison[userId]` and `[friendId]` - Friend queries

---

## Next Steps

1. Review this schema for any missing requirements
2. Run `npx prisma migrate dev` to create database
3. Start implementing game logic based on these structures


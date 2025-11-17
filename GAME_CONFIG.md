# Game Configuration & Rules

This document defines the specific game mechanics and configuration values.

## Queue System

- **Queue Opens**: 15 minutes before scheduled game time
- **Queue Closes**: At scheduled game start time
- **Status Flow**: `SCHEDULED` → `QUEUE_OPEN` → `WAITING` → `IN_PROGRESS` → `COMPLETED`

## Reconnection Window

- **Duration**: 20 seconds
- **Rule**: If a round ends before player reconnects, they are eliminated
- **Tracking**: 
  - `GameResult.disconnectedAt` - when disconnection detected
  - `GameResult.reconnectedAt` - when reconnection successful
  - `GameResult.isDisconnected` - current connection status

## Round Timing

- **Countdown Between Rounds**: 15 seconds (gives players a breather and builds anticipation)
- **Round Start Time**: Stored in `GameAnagram.roundStartedAt` (after countdown completes)
- **Round End Time**: Stored in `GameAnagram.roundEndedAt` (when round timer expires)
- **Timer**: Client-side countdown, validated server-side
- **Flow**: Round ends → 15 second countdown → Next round starts

## Submission Rate Limiting

- **Max Rate**: 1 submission per second per player per round
- **Enforcement**: Server-side validation
- **Check**: Query `SubmissionAttempt` for submissions in last 1 second
- **Error**: Return rate limit error if exceeded

## World Ranking Formula

World rank is calculated using a weighted combination of multiple factors:

### Formula Components:

1. **Win Rate** (40% weight)
   - `(totalWins / totalGames) * 100`
   - Higher is better

2. **Average Rounds Completed** (30% weight)
   - `averageRoundsCompleted`
   - Higher is better
   - Normalized against max rounds (e.g., divide by 10)

3. **Total Wins** (20% weight)
   - `totalWins`
   - Higher is better
   - Normalized (e.g., log scale or percentile)

4. **Consistency** (10% weight)
   - Based on standard deviation of rounds completed
   - Lower variance = higher score
   - Rewards consistent performance

### Calculation:

```
score = (winRate * 0.4) + (avgRounds * 0.3) + (totalWins * 0.2) + (consistency * 0.1)
```

Rank is then assigned based on score (higher score = better rank).

### Minimum Requirements:

- Must have played at least 5 games to be ranked
- Rank is recalculated periodically (e.g., daily or after each game)

### Implementation Notes:

- `User.worldRank` is cached and updated periodically
- `User.worldRankUpdatedAt` tracks when last calculated
- Consider using a background job to recalculate ranks

## Game End Conditions

Game ends when ANY of these conditions are met:

1. **One Player Remains**: Last player standing wins
2. **All Players Fail**: All remaining players eliminated in same round
3. **Max Rounds Reached**: `Game.currentRound >= Game.maxRounds`

## Round Progression (Gradual Config)

- **Round 1**: 5 letters, 60 seconds
- **Round 2**: 6 letters, 55 seconds
- **Round 3**: 7 letters, 50 seconds
- **Round 4**: 8 letters, 45 seconds
- **Round 5**: 9 letters, 40 seconds
- **Round 6**: 10 letters, 35 seconds
- **Round 7**: 11 letters, 30 seconds
- **Round 8**: 12 letters, 25 seconds
- **Round 9**: 13 letters, 20 seconds
- **Round 10**: 14 letters, 15 seconds

**Formula**:
- Length: `5 + (round - 1)` (starts at 5 letters)
- Time: `max(15, 60 - (round - 1) * 5)` seconds (minimum 15 seconds)

## Elimination Rules

- Players are eliminated at the **end of each round**
- Elimination occurs if:
  - No correct answer submitted during the round
  - Time expired without correct submission
  - Disconnected and didn't reconnect before round ended (20 second window)
- All players with at least one correct answer advance to next round

## Submission Rules

- Players can submit multiple answers per round
- Maximum 1 submission per second (rate limited)
- Only correct answers count for advancement
- First correct answer timestamp is recorded for stats
- All attempts are logged for premium analytics


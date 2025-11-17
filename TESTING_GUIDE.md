# Testing Guide

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Join the Queue
Open your browser and navigate to `http://localhost:3000`, then click "Join next game" or use the API:

```javascript
// In browser console
fetch('/api/queue/join', { 
  method: 'POST', 
  credentials: 'include' 
}).then(r => r.json()).then(console.log)
```

### 3. Start a Game Manually
```javascript
// In browser console or terminal
fetch('/api/test/start-game', { 
  method: 'POST' 
}).then(r => r.json()).then(console.log)
```

### 4. Navigate to Game
Go to `http://localhost:3000/game` to see the game UI.

---

## Testing Endpoints

All test endpoints are available in development mode. In production, they require a `TEST_SECRET` environment variable.

### Start Game
```bash
POST /api/test/start-game
```
Starts a new game with all players currently in the queue.

**Response:**
```json
{
  "message": "Game started successfully",
  "gameId": "abc123",
  "playerCount": 3,
  "gameUrl": "/game"
}
```

### Advance Round
```bash
POST /api/test/advance-round
```
Manually advances to the next round (processes current round end).

**Response:**
```json
{
  "message": "Round advanced successfully",
  "gameId": "abc123",
  "previousRound": 1,
  "currentRound": 2,
  "eliminatedCount": 2,
  "remainingPlayers": 1,
  "winner": null,
  "gameStatus": "IN_PROGRESS"
}
```

### End Round
```bash
POST /api/test/end-round
```
Forces the current round to end immediately (regardless of time remaining).

**Response:**
```json
{
  "message": "Round ended and processed successfully",
  "gameId": "abc123",
  "endedRound": 1,
  "nextRound": 2,
  "eliminatedCount": 2,
  "remainingPlayers": 1,
  "winner": null,
  "gameStatus": "IN_PROGRESS"
}
```

### Get Status
```bash
GET /api/test/status
```
Get current game and queue status.

**Response:**
```json
{
  "hasActiveGame": true,
  "game": {
    "id": "abc123",
    "status": "IN_PROGRESS",
    "currentRound": 1,
    "maxRounds": 10,
    "playerCount": 3,
    "currentRoundAnagram": {
      "roundNumber": 1,
      "anagram": "FLTUBRYTE",
      "timeSeconds": 60,
      "timeRemaining": 45
    }
  },
  "queueCount": 0
}
```

### Reset Test Data
```bash
POST /api/test/reset
```
⚠️ **WARNING**: Deletes all games, queues, and results. Use with caution!

---

## Testing Workflow

### Test Single Player Flow
1. Join queue: `POST /api/queue/join`
2. Start game: `POST /api/test/start-game`
3. Navigate to `/game`
4. Submit answers and test UI
5. End round: `POST /api/test/end-round`
6. Continue testing next round

### Test Multi-Player Flow
1. Open multiple browser windows/tabs (or incognito)
2. Join queue in each window
3. Start game: `POST /api/test/start-game`
4. Test submissions in different windows
5. End round to see eliminations
6. Verify remaining players count updates

### Test Round Transitions
1. Start a game
2. Submit correct answer in one window
3. Wait or manually end round: `POST /api/test/end-round`
4. Verify 15-second countdown appears
5. Verify next round starts automatically

### Test Final Round
1. Start a game
2. Manually advance rounds until final round: `POST /api/test/advance-round` (repeat)
3. Submit correct answer
4. Verify winner is declared
5. Verify game ends

---

## Using cURL

```bash
# Start game
curl -X POST http://localhost:3000/api/test/start-game

# Advance round
curl -X POST http://localhost:3000/api/test/advance-round

# End round
curl -X POST http://localhost:3000/api/test/end-round

# Get status
curl http://localhost:3000/api/test/status

# Reset (careful!)
curl -X POST http://localhost:3000/api/test/reset
```

---

## Using Browser Console

```javascript
// Helper functions for testing
async function startGame() {
  const res = await fetch('/api/test/start-game', { method: 'POST' })
  return res.json()
}

async function advanceRound() {
  const res = await fetch('/api/test/advance-round', { method: 'POST' })
  return res.json()
}

async function endRound() {
  const res = await fetch('/api/test/end-round', { method: 'POST' })
  return res.json()
}

async function getStatus() {
  const res = await fetch('/api/test/status')
  return res.json()
}

// Usage
await startGame()
await getStatus()
await endRound()
await advanceRound()
```

---

## Common Testing Scenarios

### Scenario 1: Test Error Handling
1. Start game
2. Submit wrong answer → Verify error banner appears
3. Press backspace → Verify letter is deleted
4. Submit correct answer → Verify success

### Scenario 2: Test Rate Limiting
1. Start game
2. Rapidly submit multiple answers (< 1 second apart)
3. Verify rate limit error appears

### Scenario 3: Test Round Timer
1. Start game
2. Check status: `GET /api/test/status`
3. Note `timeRemaining`
4. Wait or end round manually
5. Verify round ends and processes

### Scenario 4: Test Eliminations
1. Start game with 3+ players (multiple windows)
2. Submit correct answer in one window
3. Don't submit in others
4. End round: `POST /api/test/end-round`
5. Verify eliminated players see elimination screen
6. Verify remaining players continue

---

## Troubleshooting

### "No players in queue"
- Make sure you've joined the queue first: `POST /api/queue/join`
- Check queue status: `GET /api/queue/status`

### "No active game found"
- Start a game first: `POST /api/test/start-game`
- Check status: `GET /api/test/status`

### Game not updating
- Check if round has ended: `GET /api/test/status`
- Manually end round: `POST /api/test/end-round`
- Refresh the game page

### Can't submit answers
- Check if you're eliminated: Look for elimination screen
- Check if round has ended: `GET /api/test/status`
- Verify you're in the game: Check `/api/game/status`


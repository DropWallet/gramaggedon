# Quick Test Instructions

## Step 1: Start the Dev Server
```bash
npm run dev
```

## Step 2: Open Browser
Go to: http://localhost:3000

## Step 3: Join the Queue
Click the "Join next game" button on the homepage, OR open browser console and run:
```javascript
fetch('/api/queue/join', { method: 'POST', credentials: 'include' }).then(r => r.json()).then(console.log)
```

## Step 4: Start a Game
Open browser console (F12) and run:
```javascript
fetch('/api/test/start-game', { method: 'POST' }).then(r => r.json()).then(console.log)
```

## Step 5: Play!
Navigate to: http://localhost:3000/game

## Step 6: Test Round Progression
In browser console:
```javascript
// End current round
fetch('/api/test/end-round', { method: 'POST' }).then(r => r.json()).then(console.log)

// Or advance round
fetch('/api/test/advance-round', { method: 'POST' }).then(r => r.json()).then(console.log)
```

## Step 7: Check Status Anytime
```javascript
fetch('/api/test/status').then(r => r.json()).then(console.log)
```


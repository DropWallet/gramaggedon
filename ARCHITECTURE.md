# Architecture Overview

## System Design

### Core Concepts

1. **Game Sessions**: Each game runs twice daily (9 AM and 8 PM UK time)
2. **Progressive Difficulty**: 
   - Round 1: 4-letter anagram, 60 seconds
   - Round 2: 5-letter anagram, 55 seconds
   - Round 3: 6-letter anagram, 50 seconds
   - ...continues until max rounds or all players eliminated
3. **Elimination**: Players are eliminated if they:
   - Submit an incorrect answer
   - Fail to submit within the time limit
4. **Victory**: Last player standing wins, or if all players fail a round

### Data Flow

```
User Registration/Login
    ↓
Join Game Queue (before scheduled time)
    ↓
Game Starts → All players enter Round 1
    ↓
Each Round:
  - Anagram displayed
  - Timer counts down
  - Players submit answers
  - Eliminations processed
  - Next round or game end
    ↓
Results saved → Update user stats
```

### Technology Stack

#### Frontend
- **Next.js 14** (App Router) - Server-side rendering, API routes
- **React 18** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (Wordle-inspired clean design)
- **Socket.io Client** - Real-time game updates

#### Backend
- **Next.js API Routes** - REST endpoints
- **Socket.io Server** - WebSocket for real-time gameplay
- **Prisma ORM** - Database access
- **NextAuth.js** - Authentication

#### Database
- **PostgreSQL** - Primary database
- **Redis** (optional) - Caching and session management

#### Infrastructure
- **Vercel** - Hosting (recommended)
- **Supabase/Neon** - Managed PostgreSQL

## Key Components

### 1. Authentication System
- Email/password registration
- Session management with NextAuth
- Protected routes

### 2. Game Engine
- Anagram generation (from word list)
- Solution validation
- Timer management
- Round progression logic
- Elimination tracking

### 3. Real-time System
- WebSocket connections for live gameplay
- Game state synchronization
- Player action broadcasting
- Timer synchronization

### 4. Scheduling System
- UK timezone-aware scheduling
- Morning (9 AM) and Evening (8 PM) games
- Pre-game queue system
- Auto-start games at scheduled times

### 5. User Dashboard
- Current streak display
- Game history
- Statistics (win rate, average rounds, etc.)
- Leaderboards

### 6. Social Features
- Friend requests
- Friend comparisons
- Rivalry tracking (premium)

### 7. Monetization Layer
- Premium subscription
- Enhanced statistics
- Customization options
- Friend rivalry features

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out

### Games
- `GET /api/games/upcoming` - Get next scheduled games
- `POST /api/games/join` - Join game queue
- `GET /api/games/:id` - Get game details
- `GET /api/games/:id/results` - Get game results

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/history` - Get game history

### Friends
- `GET /api/friends` - List friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept friend request

## WebSocket Events

### Client → Server
- `join-game` - Join a game room
- `submit-answer` - Submit anagram solution
- `leave-game` - Leave game room

### Server → Client
- `game-start` - Game has started
- `round-start` - New round beginning
- `round-update` - Timer updates, player status
- `round-end` - Round completed
- `player-eliminated` - Player eliminated notification
- `game-end` - Game finished
- `error` - Error message

## Database Schema Highlights

### Users
- Authentication credentials
- Game statistics (streaks, wins, etc.)
- Premium status

### Games
- Scheduled times
- Current status
- Configuration (rounds, timing, etc.)

### GameResults
- Player performance per game
- Round-by-round results
- Final ranking

### Friendships
- Friend relationships
- Status (pending/accepted)

## Security Considerations

1. **Rate Limiting**: Prevent spam submissions
2. **Input Validation**: Sanitize all user inputs
3. **Authentication**: Secure session management
4. **CORS**: Configure for production domain
5. **SQL Injection**: Prisma handles this, but validate inputs
6. **XSS**: React escapes by default, but be careful with user content

## Performance Optimizations

1. **Database Indexing**: Index frequently queried fields
2. **Caching**: Cache game schedules, leaderboards
3. **WebSocket Connection Pooling**: Efficient real-time connections
4. **Code Splitting**: Lazy load game components
5. **Image Optimization**: Next.js Image component

## Scalability Considerations

1. **Horizontal Scaling**: Stateless API design
2. **Database Connection Pooling**: Prisma handles this
3. **WebSocket Scaling**: Use Redis adapter for Socket.io
4. **CDN**: Static assets via Vercel CDN
5. **Load Balancing**: Vercel handles this automatically

## Future Enhancements

1. **Mobile App**: React Native version
2. **Push Notifications**: Remind users of upcoming games
3. **Tournaments**: Special event games
4. **Achievements**: Badges and milestones
5. **Social Sharing**: Share results on social media
6. **International Expansion**: Multiple timezones


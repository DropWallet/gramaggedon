# Anagram Battle Royale

A web-based battle royale game where players compete twice daily to solve anagrams within a time limit. Each round, the anagram increases in length and the time duration decreases. The game continues until one person is left or everyone fails.

## Features

- 🎮 Twice daily competitions (morning & evening, UK timezone)
- 📈 Progressive difficulty (longer anagrams, shorter time)
- 👥 User accounts with streaks and statistics
- 🏆 Friend comparisons and leaderboards
- 💰 Monetization layer (premium stats, rivalries, customization)
- 🎨 Wordle-inspired clean UI

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Socket.io for real-time
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel (recommended)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and NextAuth secret
```

3. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (game)/            # Game pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── game/              # Game-specific components
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
│   ├── db.ts              # Database client
│   ├── auth.ts            # Auth configuration
│   └── game.ts            # Game logic
├── prisma/                # Prisma schema
│   └── schema.prisma      # Database schema
└── types/                 # TypeScript types
```

## Development Roadmap

- [x] Project setup
- [ ] Database schema
- [ ] Authentication
- [ ] Core game logic
- [ ] Real-time game rooms
- [ ] UK timezone scheduling
- [ ] User dashboard
- [ ] Friend system
- [ ] Premium features


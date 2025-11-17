# Setup Guide for Anagram Battle Royale

This guide will walk you through setting up the project step by step.

## Prerequisites

1. **Node.js**: You'll need Node.js v18 or higher. Your current version (v14) is too old. Please upgrade:
   - Visit [nodejs.org](https://nodejs.org/) and download the LTS version
   - Or use a version manager like `nvm`: `nvm install 18 && nvm use 18`

2. **PostgreSQL Database**: You'll need a PostgreSQL database running. Options:
   - **Local**: Install PostgreSQL locally
   - **Cloud (Recommended for development)**: Use [Supabase](https://supabase.com) (free tier) or [Neon](https://neon.tech) (free tier)
   - **Docker**: Run `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

3. **Git** (optional but recommended)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd anagram-battle-royale
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your database URL:

**For local PostgreSQL:**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/anagram_battle_royale?schema=public"
```

**For Supabase:**
```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```
Add the output to `NEXTAUTH_SECRET` in your `.env` file.

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database (if using local PostgreSQL)
createdb anagram_battle_royale

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure Overview

```
anagram-battle-royale/
├── app/                    # Next.js App Router (pages)
│   ├── (auth)/            # Authentication routes (to be created)
│   ├── (game)/            # Game routes (to be created)
│   ├── api/               # API endpoints (to be created)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components (to be created)
│   ├── game/              # Game components
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
│   ├── db.ts              # Database client
│   ├── game.ts            # Game logic
│   └── utils.ts           # General utilities
├── prisma/                # Database schema
│   └── schema.prisma      # Database models
└── types/                 # TypeScript types (to be created)
```

## Next Steps

Once the project is running, we'll build:

1. **Authentication System** - User registration and login
2. **Game Logic** - Anagram generation and validation
3. **Real-time Game Rooms** - WebSocket-based live gameplay
4. **Scheduling System** - UK timezone-based game scheduling
5. **User Dashboard** - Stats, streaks, and history
6. **Friend System** - Add friends and compare results
7. **Premium Features** - Monetization layer

## Development Tips

- **Database Changes**: After modifying `prisma/schema.prisma`, run:
  ```bash
  npx prisma migrate dev --name describe_your_change
  ```

- **View Database**: Use Prisma Studio:
  ```bash
  npx prisma studio
  ```

- **Type Safety**: The project uses TypeScript. Check for errors:
  ```bash
  npm run lint
  ```

## Getting Help

If you encounter issues:
1. Check that Node.js is v18+
2. Verify your database is running and accessible
3. Ensure all environment variables are set correctly
4. Check the terminal for error messages

## Deployment

When ready to deploy:
- **Frontend + API**: Deploy to [Vercel](https://vercel.com) (recommended for Next.js)
- **Database**: Use [Supabase](https://supabase.com) or [Neon](https://neon.tech) for PostgreSQL
- **Real-time**: Socket.io works on Vercel with their serverless functions


# Database Setup Guide

## Quick Setup Options

### Option 1: Supabase (Recommended - Free & Easy) ⭐

1. **Sign up**: Go to https://supabase.com and create a free account
2. **Create project**: Click "New Project"
   - Name: `anagram-battle-royale`
   - Database Password: (choose a strong password - save it!)
   - Region: Choose closest to you
3. **Get connection string**:
   - Go to Project Settings → Database
   - Find "Connection string" → "URI"
   - Copy the connection string
4. **Update .env file**:
   ```bash
   # Replace DATABASE_URL in .env with your Supabase connection string
   # It will look like:
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```
5. **Done!** Continue with migrations below.

---

### Option 2: Local PostgreSQL

1. **Install PostgreSQL** (if not installed):
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

2. **Create database**:
   ```bash
   createdb anagram_battle_royale
   ```

3. **Update .env file**:
   ```bash
   # Use this format (replace with your PostgreSQL username):
   DATABASE_URL="postgresql://[YOUR-USERNAME]@localhost:5432/anagram_battle_royale?schema=public"
   ```

---

## After Database Setup

Once you have your DATABASE_URL in the .env file, run:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

---

## Verify Setup

After running migrations, you should see:
- ✅ All tables created in your database
- ✅ Prisma client generated
- ✅ No errors

If you see errors, check:
1. DATABASE_URL is correct in .env
2. Database is running (if local)
3. You have permission to create tables

---

## Next Steps

Once database is set up, we'll:
1. ✅ Verify migrations worked
2. ✅ Test database connection
3. ✅ Start building authentication


# Supabase Setup - Step by Step

## Quick Setup (5 minutes)

### Step 1: Create Account
1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (easiest) or email

### Step 2: Create New Project
1. Click **"New Project"** button
2. Fill in:
   - **Name**: `anagram-battle-royale` (or any name you like)
   - **Database Password**: Choose a strong password ⚠️ **SAVE THIS!** You'll need it
   - **Region**: Choose closest to you (e.g., `West US` or `West EU`)
   - **Pricing Plan**: Free tier is fine
3. Click **"Create new project"**
4. Wait 1-2 minutes for project to initialize

### Step 3: Get Connection String
1. Once project is ready, go to **Project Settings** (gear icon in left sidebar)
2. Click **"Database"** in the settings menu
3. Scroll down to **"Connection string"** section
4. Find **"URI"** tab (not "Connection pooling")
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 4: Update .env File
1. Open the `.env` file in this project
2. Replace the `DATABASE_URL` line with your Supabase connection string
3. **Important**: Replace `[YOUR-PASSWORD]` with the password you set in Step 2

### Step 5: Tell Me When Done!
Once you've updated the `.env` file, let me know and I'll:
- ✅ Generate Prisma client
- ✅ Run database migrations
- ✅ Verify everything works

---

## Example .env File

After setup, your `.env` should look like:

```env
# Database
DATABASE_URL="postgresql://postgres:your-actual-password@db.abcdefghijklmnop.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="KYCEINMwkcs3+VXQJZP8BXW39ScE94LXOZ1JOhXHW9I="

# App
NODE_ENV="development"
```

---

## Troubleshooting

**Can't find connection string?**
- Make sure you're in Project Settings → Database
- Look for "Connection string" section (scroll down)
- Use the "URI" tab, not "Connection pooling"

**Connection string has [YOUR-PASSWORD]?**
- That's a placeholder - replace it with your actual database password
- The password you set when creating the project

**Project taking too long to create?**
- This is normal, can take 1-2 minutes
- Wait for the "Project is ready" message

---

## Security Note

⚠️ **Never commit your `.env` file to git!** It's already in `.gitignore`, so you're safe.


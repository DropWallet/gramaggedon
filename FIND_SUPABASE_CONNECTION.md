# How to Find Your Supabase Connection String

## Step-by-Step Guide

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Sign in if needed
3. You should see your project list

### Step 2: Select Your Project
1. Click on your project (the one you created earlier for this app)
2. Wait for the project dashboard to load

### Step 3: Navigate to Database Settings
1. Look at the **left sidebar**
2. Click on the **gear icon** (⚙️) at the bottom - this is "Project Settings"
3. In the settings menu, click on **"Database"** (should be in the left menu under Project Settings)

### Step 4: Find Connection String
1. Scroll down to find the **"Connection string"** section
2. You'll see tabs: **"URI"**, **"JDBC"**, **"Connection pooling"**, etc.
3. Click on the **"URI"** tab (this is the one you need)
4. You'll see a connection string that looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 5: Copy the Connection String
1. Click the **copy button** (📋) next to the connection string
2. **Important**: Replace `[YOUR-PASSWORD]` with your actual database password
   - This is the password you set when creating the Supabase project
   - If you forgot it, you can reset it in the same Database settings page

### Alternative: If You Can't Find It

If you still can't find it, try this:

1. **Project Settings** → **Database** → Look for **"Connection info"** or **"Connection parameters"**
2. You might see:
   - Host: `db.xxxxx.supabase.co`
   - Database: `postgres`
   - Port: `5432`
   - User: `postgres`
   - Password: (your password)

3. If you see these separately, construct the connection string:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```

### Still Stuck?

If you can't find it, you can also:
1. Check your Supabase project's **Settings** → **API** section
2. Look for **"Database URL"** or **"Connection string"**
3. Or check the **"Connection pooling"** tab - sometimes it's there too

### What to Do With It

Once you have the connection string:
1. Open your `.env` file
2. Replace line 3 with your connection string
3. Make sure to replace `[YOUR-PASSWORD]` with your actual password
4. Save the file
5. Restart your dev server


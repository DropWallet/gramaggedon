# Upgrade Node.js - Quick Guide

## Current Status
- **Current Node.js**: v14.20.1 ❌ (Too old)
- **Required**: Node.js >= 18.17.0 ✅

## Option 1: Using Homebrew (Recommended - Easiest)

Since you have Homebrew installed, this is the simplest method:

```bash
# Install Node.js 20 (LTS - Long Term Support)
brew install node@20

# Link it (if needed)
brew link node@20 --force

# Verify installation
node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x or higher
```

## Option 2: Download from nodejs.org

1. Go to https://nodejs.org/
2. Download the LTS version (v20.x.x)
3. Run the installer
4. Restart your terminal
5. Verify: `node --version`

## Option 3: Using nvm (Node Version Manager)

If you want to manage multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js 20
nvm install 20

# Use it
nvm use 20

# Set as default
nvm alias default 20
```

## After Upgrading

Once Node.js is upgraded, come back and we'll:
1. Install dependencies
2. Set up the database
3. Run migrations

## Quick Check

Run this to verify:
```bash
node --version  # Should be >= 18.17.0
npm --version   # Should be >= 9.0.0
```


# Rollback Notes - Home Page Countdown Timer & Status Check

## Date: 2025-11-18

## Changes Made

### New Files Created:
- `app/api/daily-v2/status/route.ts` - API endpoint to check if user has played today's game and get countdown timer data

### Files Modified:
- `components/home/HomeClient.tsx` - Added:
  - Status checking on component load
  - Countdown timer display (HH:MM:SS format, Rubik 700 italic, 48px)
  - "You've already played today" button state
  - Dev-only reset button above footer
  - Updated game description from "16 anagrams in 8 minutes" to "9 anagrams in 9 minutes"
  - Changed link from `/daily` to `/daily-v2`

## Features Added:
1. **Status Check**: Checks if user has completed today's daily game
2. **Countdown Timer**: Shows time until next game (00:00 GMT) in HH:MM:SS format
3. **Button State**: Changes button text based on whether game has been played
4. **Dev Reset Button**: Small button in footer (dev only) to reset game state for testing

## To Rollback:

1. Delete `app/api/daily-v2/status/route.ts`
2. Revert `components/home/HomeClient.tsx` to commit before these changes
3. Remove countdown timer, status checking, and reset button logic

## Git Commands for Rollback:
```bash
git rm app/api/daily-v2/status/route.ts
git checkout HEAD -- components/home/HomeClient.tsx
# Or use specific commit hash if needed
```


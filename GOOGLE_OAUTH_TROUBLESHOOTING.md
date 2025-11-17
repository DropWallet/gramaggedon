# Google OAuth 400 Error - Troubleshooting

## Common Causes

A 400 error from Google OAuth usually means one of these:

### 1. Redirect URI Mismatch (Most Common)

**The redirect URI in Google Cloud Console must EXACTLY match:**
```
http://localhost:3000/api/auth/callback/google
```

**Check:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- APIs & Services → Credentials
- Click your OAuth 2.0 Client ID
- Under "Authorized redirect URIs", verify you have:
  - `http://localhost:3000/api/auth/callback/google` (exact match, no trailing slash)

**Common mistakes:**
- ❌ `http://localhost:3000/api/auth/callback/google/` (trailing slash)
- ❌ `https://localhost:3000/api/auth/callback/google` (https instead of http)
- ❌ Missing the `/api/auth/callback/google` path

### 2. OAuth Consent Screen Not Configured

**Check:**
- APIs & Services → OAuth consent screen
- Make sure it's configured (even for testing)
- Add your email as a test user if in "Testing" mode

### 3. Client ID/Secret Issues

**Verify:**
- Client ID and Secret are correct in `.env`
- No extra spaces or quotes
- Environment variables are loaded (restart dev server after changes)

## How to Check the Exact Error

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try signing in with Google
4. Look for the request to `accounts.google.com`
5. Check the response - it will show the exact error message

Common error messages:
- `redirect_uri_mismatch` → Fix redirect URI in Google Cloud Console
- `invalid_client` → Check Client ID/Secret
- `access_denied` → OAuth consent screen issue

## Quick Fix Checklist

- [ ] Redirect URI in Google Cloud Console: `http://localhost:3000/api/auth/callback/google`
- [ ] OAuth consent screen is configured
- [ ] Client ID and Secret are correct in `.env`
- [ ] Restarted dev server after changing `.env`
- [ ] No trailing slashes in redirect URI


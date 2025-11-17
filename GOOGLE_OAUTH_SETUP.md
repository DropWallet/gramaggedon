# Google OAuth Setup Verification

## ✅ Credentials Status

Your Google OAuth credentials are correctly formatted and in place:

- **Client ID**: ✓ Valid format
- **Client Secret**: ✓ Valid format
- **Environment Variables**: ✓ Set in `.env` file

## ⚠️ Important: Redirect URI Setup

For Google OAuth to work, you **must** add the redirect URI in Google Cloud Console:

### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. For production, also add:
   ```
   https://your-domain.com/api/auth/callback/google
   ```
7. Click **Save**

## Testing

Once the redirect URI is set up:

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or typos

**Error: "invalid_client"**
- Verify your Client ID and Secret are correct in `.env`
- Make sure there are no extra spaces or quotes in the `.env` file

**Google sign-in button doesn't appear**
- Check browser console for errors
- Verify environment variables are loaded (restart dev server after changing `.env`)


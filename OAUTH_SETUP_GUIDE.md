# OAuth Implementation Guide

## Setup Instructions

This guide explains how to set up Google and GitHub OAuth for the PMC MERN Stack application.

---

## 1. Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **Credentials** (left sidebar)
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:4000/api/accounts/oauth/google/callback`
   - Production: `https://yourdomain.com/api/accounts/oauth/google/callback`
7. Copy the **Client ID** and **Client Secret**

### Step 2: Add to Environment Variables

Add to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/accounts/oauth/google/callback
```

---

## 2. GitHub OAuth Setup

### Step 1: Create GitHub OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - **Application name**: PMC MERN Stack
   - **Homepage URL**: `http://localhost:5173` (or your domain)
   - **Authorization callback URL**: `http://localhost:4000/api/accounts/oauth/github/callback`
4. Copy the **Client ID** and generate a **Client Secret**

### Step 2: Add to Environment Variables

Add to your `.env` file:

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:4000/api/accounts/oauth/github/callback
```

---

## 3. Backend Environment Variables Summary

Complete your `.env` file with:

```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/accounts/oauth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:4000/api/accounts/oauth/github/callback

# Frontend
APP_URL=http://localhost:5173
```

---

## 4. API Endpoints

### Get Google OAuth URL

```
GET /api/accounts/oauth/google/auth-url/

Response:
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Google OAuth Callback

```
POST /api/accounts/oauth/google/callback/

Body:
{
  "code": "4/0AcnmAz...",
  "state": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://..."
  }
}
```

### Get GitHub OAuth URL

```
GET /api/accounts/oauth/github/auth-url/

Response:
{
  "success": true,
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "state": "eyJhbGciOiJIUzI1NiIs..."
}
```

### GitHub OAuth Callback

```
POST /api/accounts/oauth/github/callback/

Body:
{
  "code": "Av0ad...",
  "state": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://..."
  }
}
```

---

## 5. Frontend Integration

### OAuth Sign-In Component

The `OAuthSignIn` component is now available in the Sign In page:

```tsx
import { OAuthSignIn } from '@/components/auth/OAuthSignIn'

<OAuthSignIn
  onSuccess={(data) => console.log(data)}
  onError={(error) => console.error(error)}
/>
```

### OAuth Callback Routes

Two new routes handle OAuth redirects:

- `/auth/google/callback` - Handles Google OAuth callback
- `/auth/github/callback` - Handles GitHub OAuth callback

These routes are automatically rendered when the OAuth provider redirects the user back to your app.

---

## 6. Frontend OAuth Service

Use the `OAuthService` class for programmatic OAuth operations:

```tsx
import { OAuthService } from '@/services/OAuthService'

// Get Google auth URL
const googleUrl = await OAuthService.getGoogleAuthUrl()

// Handle Google callback
const result = await OAuthService.handleGoogleCallback(code, state)

// Get GitHub auth URL
const githubUrl = await OAuthService.getGitHubAuthUrl()

// Handle GitHub callback
const result = await OAuthService.handleGitHubCallback(code, state)
```

---

## 7. Database Integration (TODO)

Currently, the OAuth implementation generates OAuth credentials but doesn't persist user data. To complete the implementation:

1. Create a `SocialAccount` model to store OAuth provider info
2. Update `OAuthUseCases` to create/update users in the database
3. Generate JWT tokens for authenticated users
4. Handle user creation/linking on first OAuth sign-in

Example database schema:

```typescript
interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

interface SocialAccount {
  id: string
  userId: string (FK)
  provider: 'google' | 'github'
  providerId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

## 8. Testing

### Local Testing

1. Ensure your `.env` file has all OAuth credentials
2. Start the backend: `npm run dev` (in `server/`)
3. Start the frontend: `npm run dev` (in `client/`)
4. Go to http://localhost:5173/sign-in
5. Click "Sign in with Google" or "Sign in with GitHub"
6. Authorize the app
7. You should be redirected to the OAuth callback page

### Common Issues

**Issue**: "Invalid state token"
- **Cause**: State token stored in sessionStorage doesn't match
- **Solution**: Clear browser cache and session storage, try again

**Issue**: "Invalid redirect URI"
- **Cause**: Redirect URI in OAuth app doesn't match the one in code
- **Solution**: Update redirect URI in Google/GitHub OAuth app settings

**Issue**: CORS errors
- **Cause**: Frontend and backend on different origins
- **Solution**: Ensure CORS_ORIGIN env var includes frontend URL

---

## 9. Security Notes

⚠️ **Important**: 
- Never commit `.env` files with real credentials to version control
- Use environment variables for all sensitive data
- In production, use HTTPS URLs only
- Validate state tokens to prevent CSRF attacks
- Never expose client secrets in frontend code
- Use refresh tokens for long-lived sessions
- Implement rate limiting on OAuth endpoints

---

## Support

For issues or questions:
1. Check the error message in browser console
2. Verify environment variables are set correctly
3. Check OAuth app settings match redirect URIs
4. Review backend server logs for API errors

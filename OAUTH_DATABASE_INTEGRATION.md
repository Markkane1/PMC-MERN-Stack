# OAuth Database Integration Guide

## Overview
OAuth authentication is now fully integrated with MongoDB database persistence. Users signing in via Google or GitHub are automatically created/updated in the database with account linking via the SocialAccount model.

## Database Schema Changes

### 1. User Model Extended
**File**: `server/src/infrastructure/database/models/accounts/User.ts`

Added OAuth-related fields:
- `email` (string, indexed) - User's email address
- `avatar` (string) - User's profile picture URL

```typescript
UserSchema = {
  username: string (required, unique)
  email: string (indexed)
  passwordHash: string (required)
  firstName: string
  lastName: string
  avatar: string
  // ... existing fields
  isActive: boolean
  isSuperadmin: boolean
}
```

### 2. SocialAccount Model (New)
**File**: `server/src/infrastructure/database/models/accounts/User.ts`

Tracks OAuth provider connections separately:
```typescript
SocialAccountSchema = {
  userId: ObjectId (ref: User) - Links to parent User
  provider: 'google' | 'github' (enum)
  providerId: string (unique per provider)
  email: string - Provider's email
  name: string - Provider's full name
  avatar: string - Provider's avatar URL
  raw: object - Raw provider response data
  createdAt: Date
  updatedAt: Date
}
```

**Unique Index**: `{ provider: 1, providerId: 1 }` - Prevents duplicate OAuth accounts

## Repository Layer

### User Repository Extended
**File**: `server/src/domain/repositories/accounts.ts`

New method:
```typescript
findByEmail(email: string): Promise<User | null>
```

### Social Account Repository (New)
**File**: `server/src/domain/repositories/accounts.ts`

Complete CRUD operations:
```typescript
interface SocialAccountRepository {
  findById(id: string): Promise<SocialAccount | null>
  findByProviderAndId(provider: string, providerId: string): Promise<SocialAccount | null>
  findByUserId(userId: string): Promise<SocialAccount[]>
  create(account: any): Promise<SocialAccount>
  updateById(id: string, updates: any): Promise<SocialAccount | null>
  deleteById(id: string): Promise<void>
}
```

**Implementation**: `server/src/infrastructure/database/repositories/accounts/index.ts`

## Use Case Layer Implementation

**File**: `server/src/application/usecases/accounts/OAuthUseCases.ts`

### Google OAuth Flow
```
1. Verify state token (CSRF protection)
2. Exchange auth code for tokens
3. Fetch user info from Google
4. Check if social account exists
   - If YES: Load existing user
   - If NO: Check if user exists by email
     - If YES: Update user with OAuth data
     - If NO: Create new user with auto-generated username
5. Create/Link SocialAccount record
6. Generate JWT token
7. Return token + user info
```

### GitHub OAuth Flow
```
1. Verify state token (CSRF protection)
2. Exchange auth code for tokens
3. Fetch user info from GitHub
4. Fetch email (may not be public)
5. Check if social account exists
   - If YES: Load existing user
   - If NO: Check if user exists by email
     - If YES: Update user with OAuth data
     - If NO: Create new user with GitHub login as username
6. Create/Link SocialAccount record
7. Generate JWT token
8. Return token + user info
```

### Helper Methods
- `generateUniqueUsername(email)` - Extracts username from email
- `generateTemporaryPasswordHash()` - Creates unusable hash for OAuth users

## API Integration

### Controllers
**File**: `server/src/interfaces/http/controllers/accounts/OAuthController.ts`

#### Endpoints
1. `GET /api/accounts/oauth/google/auth-url`
   - Returns: `{ success, authUrl, state }`
   - Public endpoint

2. `POST /api/accounts/oauth/google/callback`
   - Body: `{ code, state }`
   - Returns: `{ success, token, user }`

3. `GET /api/accounts/oauth/github/auth-url`
   - Returns: `{ success, authUrl, state }`
   - Public endpoint

4. `POST /api/accounts/oauth/github/callback`
   - Body: `{ code, state }`
   - Returns: `{ success, token, user }`

### Routes
**File**: `server/src/interfaces/http/routes/accounts.routes.ts`

All OAuth routes registered and mounted at `/api/accounts/oauth/*`

## Frontend Integration

### Token Storage
**File**: `client/src/components/auth/OAuthCallback.tsx`

```typescript
// After successful OAuth callback:
localStorage.setItem('token', jwtToken)     // JWT for API auth
localStorage.setItem('user', userJSON)      // User profile data
sessionStorage.removeItem('oauth_state')    // Clean up CSRF token
navigate('/dashboard')                      // Redirect
```

### User State Management
The JWT token is automatically used for subsequent API requests via the auth middleware in your frontend.

## Security Features

### 1. CSRF Protection
- State tokens generated with JWT (10-minute expiry)
- Client stores state in sessionStorage
- State verified on callback before token exchange

### 2. Password Security
- OAuth users don't have usable passwords
- `generateTemporaryPasswordHash()` creates random hash
- Prevents unauthorized password login

### 3. Account Linking
- Email-based linking for existing users
- Prevents duplicate accounts
- Maintains user identity across providers

### 4. Data Validation
- Code and state parameters validated
- Email resolution for GitHub (may not be public)
- Provider ID normalization

## Database Operations Flow

```
OAuth Callback Received
    ↓
Verify CSRF Token
    ↓
Exchange Code for Access Token
    ↓
Fetch Provider User Info
    ↓
Check SocialAccount.findByProviderAndId()
    ├─ EXISTS: Use existing user
    └─ NOT EXISTS:
        ↓
        User.findByEmail()
        ├─ EXISTS: Link to existing user
        └─ NOT EXISTS: User.create() → new user
        ↓
        SocialAccount.create() → Link provider
    ↓
Generate JWT Token
    ↓
Return Token + User Info
```

## Testing OAuth Flow

### Prerequisites
1. Google OAuth App
   - Credentials in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Redirect URI: `http://localhost:4000/api/accounts/oauth/google/callback`

2. GitHub OAuth App
   - Credentials in `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - Redirect URI: `http://localhost:4000/api/accounts/oauth/github/callback`

### Test Steps
1. Start backend: `npm start` (in `/server`)
2. Start frontend: `npm run dev` (in `/client`)
3. Click "Sign in with Google" or "Sign in with GitHub"
4. Complete OAuth flow
5. Verify token in localStorage
6. Verify user created/updated in MongoDB
7. Verify SocialAccount created

## Database Queries

### Find user by OAuth provider
```javascript
db.socialAccounts.findOne({ provider: 'google', providerId: 'xxx' })
```

### List all OAuth accounts for user
```javascript
db.socialAccounts.find({ userId: ObjectId('xxx') })
```

### Find users with email
```javascript
db.users.find({ email: 'user@example.com' })
```

### Unlink OAuth account
```javascript
db.socialAccounts.deleteOne({ _id: ObjectId('xxx') })
```

## Files Modified/Created

**Created:**
- `server/src/infrastructure/database/models/accounts/User.ts` - SocialAccount model added
- `server/src/application/services/OAuthService.ts` - OAuth provider logic
- `server/src/application/usecases/accounts/OAuthUseCases.ts` - Database persistence
- `server/src/interfaces/http/controllers/accounts/OAuthController.ts` - HTTP endpoints
- `client/src/components/auth/OAuthSignIn.tsx` - Sign-in UI
- `client/src/components/auth/OAuthCallback.tsx` - Callback handler
- `client/src/services/OAuthService.ts` - Frontend API calls
- `client/src/views/auth/GoogleOAuthCallback.tsx` - Google callback page
- `client/src/views/auth/GitHubOAuthCallback.tsx` - GitHub callback page

**Modified:**
- `server/src/domain/entities/accounts.ts` - Added email, avatar to User; added SocialAccount type
- `server/src/domain/repositories/accounts.ts` - Added findByEmail, SocialAccountRepository interface
- `server/src/infrastructure/database/repositories/accounts/index.ts` - Repository implementations
- `server/src/interfaces/http/routes/accounts.routes.ts` - OAuth route registration
- `server/src/infrastructure/config/env.ts` - OAuth configuration variables
- `server/.env.example` - OAuth credential placeholders
- `client/.env.example` - OAuth feature flag settings
- `client/src/configs/routes.config/authRoute.ts` - OAuth callback routes
- `client/src/views/auth/SignIn/SignIn.tsx` - Integrated OAuth buttons

## Troubleshooting

### Issue: "Invalid state token"
- **Cause**: State mismatch or CSRF token expired (10 min)
- **Fix**: Ensure OAuth flow completes within 10 minutes

### Issue: "Missing authorization code"
- **Cause**: Provider redirect didn't include `code` param
- **Fix**: Verify OAuth app credentials and redirect URIs

### Issue: User not created in database
- **Cause**: Database connection issue or duplicate email
- **Fix**: Check MongoDB connection and email uniqueness

### Issue: Token not stored in frontend
- **Cause**: localStorage access denied
- **Fix**: Verify browser allows localStorage, check Privacy settings

## Next Steps

1. **Email Verification** (Optional)
   - Send verification email for OAuth-created accounts
   - Require email confirmation before full access

2. **Account Merging** (Optional)
   - Allow connecting multiple OAuth providers to one account
   - Implement account merge workflow

3. **Profile Sync** (Optional)
   - Auto-update user profile from provider data
   - Refresh avatar/name on login

4. **Logout** (Required)
   - Implement logout endpoint to revoke OAuth tokens
   - Clear localStorage on client-side logout

## Related Documentation

- [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md) - Initial OAuth setup
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API endpoints
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

import { OAuthService, GoogleUserInfo, GitHubUserInfo } from '../../services/OAuthService'
import { userRepositoryMongo, socialAccountRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'
import { signTokens } from '../../services/accounts/AuthService'
import crypto from 'crypto'

export interface OAuthCallbackRequest {
  code: string
  state: string
}

export interface OAuthUserData {
  email: string
  name: string
  avatar?: string
  provider: 'google' | 'github'
  providerId: string
}

export interface OAuthCallbackResponse {
  success: boolean
  token?: string
  refreshToken?: string
  user?: {
    id: string
    email: string
    name: string
    avatar?: string
  }
  error?: string
}

export class OAuthUseCases {
  /**
   * Generate unique username from email
   */
  private static generateUniqueUsername(email: string): string {
    const baseUsername = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '')
    return baseUsername.substring(0, 20) // Limit to 20 chars
  }

  /**
   * Generate temporary password hash for OAuth users
   */
  private static generateTemporaryPasswordHash(): string {
    // OAuth users don't have passwords, create an unusable hash
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleCallback(code: string, state: string): Promise<OAuthCallbackResponse> {
    try {
      // Verify state token for CSRF protection
      if (!OAuthService.verifyStateToken(state)) {
        return {
          success: false,
          error: 'Invalid state token - possible CSRF attack',
        }
      }

      // Exchange code for tokens
      const tokenResponse = await OAuthService.exchangeGoogleCode(code)

      // Get user info
      const userInfo = await OAuthService.getGoogleUserInfo(tokenResponse.access_token)

      // Check if social account already exists
      let socialAccount = await socialAccountRepositoryMongo.findByProviderAndId('google', userInfo.id)
      let user = null

      if (socialAccount) {
        // User already exists, fetch their user record
        user = await userRepositoryMongo.findById(socialAccount.userId)
      } else {
        // Check if user exists by email
        user = await userRepositoryMongo.findByEmail(userInfo.email)

        if (!user) {
          // Create new user - generate username from email
          const username = this.generateUniqueUsername(userInfo.email)
          const fullName = userInfo.name || userInfo.email.split('@')[0]
          const nameParts = fullName.split(' ')

          user = await userRepositoryMongo.create({
            username,
            email: userInfo.email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            avatar: userInfo.picture,
            passwordHash: this.generateTemporaryPasswordHash(), // OAuth users don't need password
            isActive: true,
            groups: [],
          })
        } else if (!user.email) {
          // Update user with email if missing
          user = await userRepositoryMongo.updateById(user.id as string, {
            email: userInfo.email,
            avatar: userInfo.picture,
          })
        }

        // Create social account link
        if (user) {
          await socialAccountRepositoryMongo.create({
            userId: user.id,
            provider: 'google',
            providerId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture,
            raw: userInfo,
          })
        }
      }

      if (!user) {
        return {
          success: false,
          error: 'Failed to create or retrieve user',
        }
      }

      // Generate JWT token
      const { access: jwtToken } = signTokens(user.id as string)

      return {
        success: true,
        token: jwtToken,
        user: {
          id: user.id as string,
          email: user.email || '',
          name: user.firstName || user.username,
          avatar: user.avatar,
        },
      }
    } catch (error) {
      console.error('Google OAuth callback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google OAuth failed',
      }
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  static async handleGitHubCallback(code: string, state: string): Promise<OAuthCallbackResponse> {
    try {
      // Verify state token for CSRF protection
      if (!OAuthService.verifyStateToken(state)) {
        return {
          success: false,
          error: 'Invalid state token - possible CSRF attack',
        }
      }

      // Exchange code for tokens
      const tokenResponse = await OAuthService.exchangeGitHubCode(code)

      // Get user info
      const userInfo = await OAuthService.getGitHubUserInfo(tokenResponse.access_token)

      // Get email (might not be public)
      let email = userInfo.email
      if (!email) {
        email = await OAuthService.getGitHubUserEmail(tokenResponse.access_token)
      }

      // Check if social account already exists
      let socialAccount = await socialAccountRepositoryMongo.findByProviderAndId('github', String(userInfo.id))
      let user = null

      if (socialAccount) {
        // User already exists, fetch their user record
        user = await userRepositoryMongo.findById(socialAccount.userId)
      } else {
        // Check if user exists by email
        user = email ? await userRepositoryMongo.findByEmail(email) : null

        if (!user) {
          // Create new user - use GitHub login as username
          const username = userInfo.login || this.generateUniqueUsername(email || 'github-' + userInfo.id)

          user = await userRepositoryMongo.create({
            username,
            email: email || undefined,
            firstName: userInfo.name ? userInfo.name.split(' ')[0] : '',
            lastName: userInfo.name ? userInfo.name.split(' ').slice(1).join(' ') : '',
            avatar: userInfo.avatar_url,
            passwordHash: this.generateTemporaryPasswordHash(), // OAuth users don't need password
            isActive: true,
            groups: [],
          })
        } else if (!user.email && email) {
          // Update user with email if missing
          user = await userRepositoryMongo.updateById(user.id as string, {
            email,
            avatar: userInfo.avatar_url,
          })
        }

        // Create social account link
        if (user) {
          await socialAccountRepositoryMongo.create({
            userId: user.id,
            provider: 'github',
            providerId: String(userInfo.id),
            email,
            name: userInfo.name || userInfo.login,
            avatar: userInfo.avatar_url,
            raw: userInfo,
          })
        }
      }

      if (!user) {
        return {
          success: false,
          error: 'Failed to create or retrieve user',
        }
      }

      // Generate JWT token
      const { access: jwtToken } = signTokens(user.id as string)

      return {
        success: true,
        token: jwtToken,
        user: {
          id: user.id as string,
          email: user.email || '',
          name: user.firstName || user.username,
          avatar: user.avatar,
        },
      }
    } catch (error) {
      console.error('GitHub OAuth callback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GitHub OAuth failed',
      }
    }
  }
}

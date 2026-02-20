import axios from 'axios'
import jwt from 'jsonwebtoken'
import { env } from '../../infrastructure/config/env'

export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  picture: string
  locale?: string
}

export interface GitHubTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  token_type: string
  scope: string
}

export interface GitHubUserInfo {
  id: number
  login: string
  email: string
  name: string
  avatar_url: string
  bio?: string
  location?: string
}

export class OAuthService {
  /**
   * Exchange Google authorization code for access token
   */
  static async exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: env.googleRedirectUri,
          grant_type: 'authorization_code',
        }
      )
      return response.data
    } catch (error) {
      throw new Error(`Failed to exchange Google code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get Google user info from access token
   */
  static async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data
    } catch (error) {
      throw new Error(`Failed to get Google user info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify Google ID token (optional, for extra security)
   */
  static async verifyGoogleIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=${idToken}`
      )
      return {
        id: response.data.user_id,
        email: response.data.email,
        verified_email: response.data.email_verified,
        name: response.data.name || '',
        picture: response.data.picture || '',
      }
    } catch (error) {
      throw new Error(`Failed to verify Google ID token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Exchange GitHub authorization code for access token
   */
  static async exchangeGitHubCode(code: string): Promise<GitHubTokenResponse> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.githubClientId,
          client_secret: env.githubClientSecret,
          code,
          redirect_uri: env.githubRedirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to exchange GitHub code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get GitHub user info from access token
   */
  static async getGitHubUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    try {
      const response = await axios.get<GitHubUserInfo>(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )
      return response.data
    } catch (error) {
      throw new Error(`Failed to get GitHub user info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get GitHub user email (in case it's not public)
   */
  static async getGitHubUserEmail(accessToken: string): Promise<string> {
    try {
      const response = await axios.get<Array<{ email: string; primary: boolean; verified: boolean }>>(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      // Find primary email, or first verified, or first one
      const primaryEmail = response.data.find((e) => e.primary)
      const verifiedEmail = response.data.find((e) => e.verified)
      const firstEmail = response.data[0]

      return primaryEmail?.email || verifiedEmail?.email || firstEmail?.email || ''
    } catch (error) {
      throw new Error(`Failed to get GitHub user email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate OAuth redirect URL for Google
   */
  static generateGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Generate OAuth redirect URL for GitHub
   */
  static generateGitHubAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.githubClientId,
      redirect_uri: env.githubRedirectUri,
      state,
      scope: 'user:email',
      allow_signup: 'true',
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * Create a state token for CSRF protection
   */
  static createStateToken(): string {
    return jwt.sign(
      {
        nonce: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
      },
      env.jwtSecret,
      { expiresIn: '10m' }
    )
  }

  /**
   * Verify a state token
   */
  static verifyStateToken(state: string): boolean {
    try {
      jwt.verify(state, env.jwtSecret)
      return true
    } catch {
      return false
    }
  }
}

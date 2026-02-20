/**
 * OAuth Service
 * Handles OAuth-related API calls
 */

import ApiService from './ApiService'

export interface OAuthAuthUrlResponse {
  success: boolean
  authUrl: string
  state: string
  error?: string
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

export class OAuthService {
  /**
   * Get Google OAuth authorization URL
   */
  static async getGoogleAuthUrl(): Promise<OAuthAuthUrlResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<OAuthAuthUrlResponse>({
        method: 'GET',
        url: '/accounts/oauth/google/auth-url/',
      })
      return response
    } catch (error) {
      return {
        success: false,
        authUrl: '',
        state: '',
        error: error instanceof Error ? error.message : 'Failed to get Google auth URL',
      }
    }
  }

  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleCallback(
    code: string,
    state: string
  ): Promise<OAuthCallbackResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<OAuthCallbackResponse>({
        method: 'POST',
        url: '/accounts/oauth/google/callback/',
        data: { code, state },
      })
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google OAuth callback failed',
      }
    }
  }

  /**
   * Get GitHub OAuth authorization URL
   */
  static async getGitHubAuthUrl(): Promise<OAuthAuthUrlResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<OAuthAuthUrlResponse>({
        method: 'GET',
        url: '/accounts/oauth/github/auth-url/',
      })
      return response
    } catch (error) {
      return {
        success: false,
        authUrl: '',
        state: '',
        error: error instanceof Error ? error.message : 'Failed to get GitHub auth URL',
      }
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  static async handleGitHubCallback(
    code: string,
    state: string
  ): Promise<OAuthCallbackResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<OAuthCallbackResponse>({
        method: 'POST',
        url: '/accounts/oauth/github/callback/',
        data: { code, state },
      })
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GitHub OAuth callback failed',
      }
    }
  }
}

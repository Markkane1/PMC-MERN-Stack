import type { Request, Response } from 'express'
import { OAuthService } from '../../../../application/services/OAuthService'
import { OAuthUseCases } from '../../../../application/usecases/accounts/OAuthUseCases'

/**
 * GET /api/accounts/oauth/google/auth-url
 * Generate Google OAuth redirect URL
 */
export async function getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const state = OAuthService.createStateToken()
    const authUrl = OAuthService.generateGoogleAuthUrl(state)

    res.json({
      success: true,
      authUrl,
      state,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Google auth URL',
    })
  }
}

/**
 * POST /api/accounts/oauth/google/callback
 * Handle Google OAuth callback
 * Body: { code, state }
 */
export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state } = req.body

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
      })
      return
    }

    const result = await OAuthUseCases.handleGoogleCallback(code, state)

    if (!result.success) {
      res.status(401).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Google OAuth callback failed',
    })
  }
}

/**
 * GET /api/accounts/oauth/github/auth-url
 * Generate GitHub OAuth redirect URL
 */
export async function getGitHubAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const state = OAuthService.createStateToken()
    const authUrl = OAuthService.generateGitHubAuthUrl(state)

    res.json({
      success: true,
      authUrl,
      state,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate GitHub auth URL',
    })
  }
}

/**
 * POST /api/accounts/oauth/github/callback
 * Handle GitHub OAuth callback
 * Body: { code, state }
 */
export async function handleGitHubCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state } = req.body

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
      })
      return
    }

    const result = await OAuthUseCases.handleGitHubCallback(code, state)

    if (!result.success) {
      res.status(401).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub OAuth callback failed',
    })
  }
}

import { OAuthCallback } from '../../components/auth/OAuthCallback'

/**
 * Google OAuth Callback Page
 * Handles the redirect from Google OAuth after user authorization
 */
export const GoogleOAuthCallbackPage = () => {
  return <OAuthCallback provider="google" />
}

export default GoogleOAuthCallbackPage

import { OAuthCallback } from '../../components/auth/OAuthCallback'

/**
 * GitHub OAuth Callback Page
 * Handles the redirect from GitHub OAuth after user authorization
 */
export const GitHubOAuthCallbackPage = () => {
  return <OAuthCallback provider="github" />
}

export default GitHubOAuthCallbackPage

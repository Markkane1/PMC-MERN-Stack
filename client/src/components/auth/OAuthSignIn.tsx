import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

interface OAuthSignInProps {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export const OAuthSignIn = ({ onSuccess, onError }: OAuthSignInProps) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Get auth URL from backend
      const response = await fetch('/api/accounts/oauth/google/auth-url/')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get Google auth URL')
      }

      // Store state in sessionStorage (for verification on callback)
      sessionStorage.setItem('oauth_state', data.state)

      // Redirect to Google
      window.location.href = data.authUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Get auth URL from backend
      const response = await fetch('/api/accounts/oauth/github/auth-url/')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get GitHub auth URL')
      }

      // Store state in sessionStorage (for verification on callback)
      sessionStorage.setItem('oauth_state', data.state)

      // Redirect to GitHub
      window.location.href = data.authUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub sign-in failed'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FcGoogle size={20} />
        <span className="text-sm font-medium">Sign in with Google</span>
      </button>

      <button
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FaGithub size={20} className="text-gray-800" />
        <span className="text-sm font-medium">Sign in with GitHub</span>
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or continue with email</span>
        </div>
      </div>
    </div>
  )
}

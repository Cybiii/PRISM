'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { storeAuthData } from '../../lib/auth'
import { BeakerIcon } from '@heroicons/react/24/outline'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get URL parameters
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const userId = searchParams.get('user_id')
        const email = searchParams.get('email')
        const fullName = searchParams.get('full_name')
        const errorParam = searchParams.get('error')

        // Handle errors from OAuth flow
        if (errorParam) {
          const errorMessages: { [key: string]: string } = {
            oauth_error: 'Google authentication was cancelled or failed',
            no_code: 'No authorization code received from Google',
            exchange_failed: 'Failed to exchange authorization code',
            callback_error: 'An error occurred during authentication'
          }
          
          setError(errorMessages[errorParam] || 'Authentication failed')
          setStatus('error')
          return
        }

        // Validate required parameters
        if (!accessToken || !refreshToken || !userId || !email) {
          setError('Missing authentication data from Google')
          setStatus('error')
          return
        }

        console.log('🔍 Processing Google OAuth callback:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          userId,
          email,
          fullName
        })

        // Store authentication data
        storeAuthData(
          {
            accessToken,
            refreshToken
          },
          {
            user: {
              id: userId,
              email,
              emailConfirmed: true // Google users are always confirmed
            },
            profile: {
              id: userId,
              full_name: fullName || 'Google User'
            }
          }
        )

        setStatus('success')
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)

      } catch (error) {
        console.error('OAuth callback processing error:', error)
        setError('An unexpected error occurred during authentication')
        setStatus('error')
      }
    }

    processCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-blue-200 max-w-md w-full text-center">
        {/* App Icon */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <BeakerIcon className="w-8 h-8 text-white" />
        </div>

        {/* Processing */}
        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-blue-900 mb-2">Completing Sign-In</h2>
            <p className="text-blue-700/70">Please wait while we verify your Google account...</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-900 mb-2">Welcome to PRISM!</h2>
            <p className="text-green-700/70">Sign-in successful. Redirecting to your dashboard...</p>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Sign-In Failed</h2>
            <p className="text-red-700/70 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
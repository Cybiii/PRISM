'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BeakerIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CloudIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { storeAuthData } from '../lib/auth'

interface LoginResponse {
  success: boolean
  data?: {
    user: any
    profile: any
    access_token: string
    refresh_token: string
  }
  error?: string
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🔍 Attempting login to:', 'http://localhost:3001/api/auth/signin')
      const response = await fetch('http://localhost:3001/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('🔍 Login response status:', response.status)
      const result: LoginResponse = await response.json()
      console.log('🔍 Login response:', result)

      if (result.success && result.data) {
        console.log('🔍 Login response data:', result.data)
        storeAuthData(
          {
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken
          },
          {
            user: result.data.user,
            profile: result.data.profile
          }
        )
        router.push('/dashboard')
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      console.log('🔍 Attempting Google Sign-In')
      
      // Redirect to backend Google OAuth endpoint
      window.location.href = 'http://localhost:3001/api/auth/google'
      
    } catch (error) {
      console.error('Google Sign-In error:', error)
      setError('Google Sign-In failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Wave Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230ea5e9' fill-opacity='0.4'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20S-10 18.954-10 30s8.954 20 20 20 20-8.954 20-20zM10 10c0-11.046-8.954-20-20-20S-30-1.046-30 10s8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-blue-300/30">
            <BeakerIcon className="w-10 h-10 text-white" />
          </div>
          
                      <h1 className="text-4xl font-bold text-blue-900 mb-2">
            PRISM Health
          </h1>
          <p className="text-blue-700/80">Intelligent Health Monitoring Platform</p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: HeartIcon, color: 'bg-blue-500', label: 'Hydration' },
            { icon: ChartBarIcon, color: 'bg-cyan-500', label: 'Analytics' },
            { icon: CloudIcon, color: 'bg-sky-500', label: 'Real-time' }
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 text-center border border-blue-200 shadow-sm"
            >
              <div className={`w-8 h-8 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                <feature.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-blue-700">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-200">
          <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400/50 backdrop-blur-sm"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400/50 backdrop-blur-sm pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-blue-600 font-medium">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-blue-200 rounded-xl text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-blue-700/70">
              Don't have an account?{' '}
              <a 
                href="/signup" 
                className="text-blue-700 hover:text-blue-900 font-semibold"
              >
                Sign up here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
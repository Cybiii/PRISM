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
      const response = await fetch('http://localhost:3001/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result: LoginResponse = await response.json()

      if (result.success && result.data) {
        storeAuthData(
          {
            accessToken: result.data.access_token,
            refreshToken: result.data.refresh_token
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
            PUMA Health
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
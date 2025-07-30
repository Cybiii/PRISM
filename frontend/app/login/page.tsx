'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BeakerIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  SparklesIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface AuthResponse {
  success: boolean
  data?: {
    user: {
      id: string
      email: string
      emailConfirmed: boolean
    }
    profile: any
    accessToken: string
    refreshToken: string
  }
  error?: string
}

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data: AuthResponse = await response.json()
      
      if (data.success && data.data) {
        localStorage.setItem('puma_access_token', data.data.accessToken)
        localStorage.setItem('puma_refresh_token', data.data.refreshToken)
        localStorage.setItem('puma_user_data', JSON.stringify({
          user: data.data.user,
          profile: data.data.profile
        }))

        router.push('/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('Starting comprehensive manual reading...')
      
      const response = await fetch('http://localhost:3001/api/auth/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data: AuthResponse = await response.json()

      if (data.success && data.data) {
        localStorage.setItem('puma_access_token', data.data.accessToken)
        localStorage.setItem('puma_refresh_token', data.data.refreshToken)
        localStorage.setItem('puma_user_data', JSON.stringify({
          user: data.data.user,
          profile: data.data.profile
        }))

        router.push('/dashboard')
      } else {
        setError(data.error || 'Demo login failed')
      }
    } catch (err) {
      console.error('Demo login error:', err)
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4 md:p-6 lg:p-8">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-20 h-20 bg-blue-200 rounded-full opacity-10" />
        <div className="absolute top-40 right-32 w-16 h-16 bg-purple-200 rounded-full opacity-10" />
        <div className="absolute bottom-32 left-32 w-24 h-24 bg-indigo-200 rounded-full opacity-10" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <BeakerIcon className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            PUMA Health
          </h1>
          <p className="text-gray-600">Intelligent Health Monitoring Platform</p>
        </motion.div>

        {/* Features Preview */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm"
          >
            <HeartIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Hydration Tracking</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm"
          >
            <ChartBarIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">pH Monitoring</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm"
          >
            <SparklesIcon className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">AI Analysis</p>
          </motion.div>
        </motion.div>

        {/* Login Card */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/90 backdrop-blur-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100"
        >
                      <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <motion.div 
                whileFocus={{ scale: 1.02 }}
                className="relative"
              >
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 md:pl-10 pr-4 py-3 md:py-3 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-base"
                  placeholder="Enter your email"
                />
              </motion.div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <motion.div 
                whileFocus={{ scale: 1.02 }}
                className="relative"
              >
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 md:pl-10 pr-11 md:pr-12 py-3 md:py-3 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-base"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <EyeIcon className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              </motion.div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 md:py-3 rounded-lg md:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

                         {/* Demo Button */}
             <motion.button
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               type="button"
               onClick={handleDemoLogin}
               disabled={loading}
               className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 md:py-3 rounded-lg md:rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base"
             >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-600 rounded-full"
                  />
                  <span>Creating Demo Account...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <SparklesIcon className="w-5 h-5" />
                  <span>Try Demo Account</span>
                </div>
              )}
            </motion.button>
          </form>

          {/* Additional Links */}
          <motion.div 
            variants={itemVariants}
            className="mt-6 text-center space-y-2"
          >
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => router.push('/signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </motion.button>
            </p>
            <p className="text-xs text-gray-500">
              Secure health monitoring with AI-powered insights
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          variants={itemVariants}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>© 2024 PUMA Health. Advanced health monitoring technology.</p>
        </motion.div>
      </motion.div>
    </div>
  )
} 
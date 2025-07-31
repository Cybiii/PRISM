'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function InsightsPage() {
  const router = useRouter()
  const [backendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('connected')
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null)

  // Load user profile for navbar
  useEffect(() => {
    const loadNavUserProfile = async () => {
      try {
        const userData = localStorage.getItem('puma_user_data')
        if (userData) {
          const parsed = JSON.parse(userData)
          setUserProfile({
            full_name: parsed.profile?.full_name
          })
        }
      } catch (error) {
        console.error('Error loading nav user profile:', error)
      }
    }
    loadNavUserProfile()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('puma_access_token')
    localStorage.removeItem('puma_refresh_token')
    localStorage.removeItem('puma_user_data')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="hidden md:block bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1.5 rounded-full border border-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">
                  {backendStatus === 'connected' ? 'System Online' : 'System Offline'}
                </span>
              </div>

              {/* User Profile Button */}
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                  {userProfile?.full_name || 'User'}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <SparklesIcon className="w-8 h-8 mr-3 text-blue-600" />
            Health Insights
          </h1>
          <p className="text-gray-600">
            AI-powered health insights and personalized recommendations based on your PUMA readings
          </p>
        </motion.div>

        {/* Coming Soon Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <ChartBarIcon className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Trend Analysis</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Advanced analytics of your health patterns over time, identifying trends and correlations.
            </p>
            <div className="bg-blue-50 rounded-lg p-3">
              <span className="text-blue-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <LightBulbIcon className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Smart Recommendations</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Personalized health recommendations based on your unique reading patterns and health profile.
            </p>
            <div className="bg-green-50 rounded-lg p-3">
              <span className="text-green-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Predictive Health</h3>
            </div>
            <p className="text-gray-600 mb-4">
              AI-powered predictions and early warning systems for potential health concerns.
            </p>
            <div className="bg-purple-50 rounded-lg p-3">
              <span className="text-purple-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>
        </div>

        {/* Placeholder Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <SparklesIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Advanced Health Intelligence</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This section will feature advanced AI-powered health insights, trend analysis, 
            and predictive health monitoring based on your continuous PUMA sensor readings. 
            Stay tuned for these exciting features!
          </p>
        </motion.div>
      </div>
    </div>
  )
} 
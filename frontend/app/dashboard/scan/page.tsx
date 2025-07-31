'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import LiveAnalysisMonitor from '../../components/LiveAnalysisMonitor'

export default function ScanPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Process</h1>
          <p className="text-gray-600">
            Monitor real-time PUMA sensor analysis from connection to storage
          </p>
        </motion.div>

        {/* Live Analysis Monitor Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <LiveAnalysisMonitor />
        </motion.div>
      </div>
    </div>
  )
} 
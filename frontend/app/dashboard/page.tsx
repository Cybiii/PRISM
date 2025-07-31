'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// Animation imports removed for performance
import { 
  BeakerIcon, 
  HeartIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,

  WifiIcon,
  NoSymbolIcon,
  ScaleIcon,
  UserIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'

import LiveAnalysisMonitor from '../components/LiveAnalysisMonitor'
import BottomNav from '../ui/dashboard/bottomnav'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
}

export default function Dashboard() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [lastReadingTime, setLastReadingTime] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  // Update current time every second
  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userData = localStorage.getItem('puma_user_data')
        if (userData) {
          const parsed = JSON.parse(userData)
          setUserProfile({
            id: parsed.user?.id || 'unknown',
            email: parsed.user?.email || 'unknown@example.com',
            full_name: parsed.profile?.full_name,
            age: parsed.profile?.age,
            gender: parsed.profile?.gender
          })
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    loadUserProfile()
  }, [])

  // Check backend connection
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          setBackendStatus('connected')
        } else {
          setBackendStatus('disconnected')
        }
      } catch (error) {
        console.error('Backend connection check failed:', error)
        setBackendStatus('disconnected')
      }
    }

    checkBackendConnection()
    const interval = setInterval(checkBackendConnection, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('puma_access_token')
    localStorage.removeItem('puma_refresh_token') 
    localStorage.removeItem('puma_user_data')
    router.push('/login')
  }



  const connectionIcon = connectionStatus === 'connected' 
    ? WifiIcon 
    : connectionStatus === 'disconnected' 
      ? NoSymbolIcon 
      : CpuChipIcon

  if (!mounted) {
    return null
  }

// Animation variants removed for performance

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header - Essential Controls Only */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">


        {/* Welcome Section - Compact */}
        <div className="mb-4">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-1">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'User'}!
            </h2>
            <p className="text-sm text-blue-600">{todayStr}</p>
          </div>
        </div>

        {/* Live Analysis Monitor */}
        <div className="mb-6">
          <LiveAnalysisMonitor />
        </div>


      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  )
}

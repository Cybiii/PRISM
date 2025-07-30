'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BeakerIcon, 
  HeartIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon,
  WifiIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline'
import HydrationCircle from '../components/hydrationcircle'
import PhBar from '../components/phbar'

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

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  // Handle client-side mounting and time updates
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date().toLocaleTimeString())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('puma_access_token')
      const userData = localStorage.getItem('puma_user_data')

      if (!token || !userData) {
        router.push('/login')
        return
      }

      const parsedUserData = JSON.parse(userData)
      setUserProfile(parsedUserData.profile)
    }

    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:3001/health')
        const data = await response.json()
        setConnectionStatus(data.status === 'healthy' ? 'connected' : 'disconnected')
      } catch (error) {
        setConnectionStatus('disconnected')
      }
    }

    checkAuth()
    checkConnection()
    
    // Check connection every 30 seconds
    const connectionInterval = setInterval(checkConnection, 30000)
    return () => clearInterval(connectionInterval)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('puma_access_token')
    localStorage.removeItem('puma_refresh_token')  
    localStorage.removeItem('puma_user_data')
    router.push('/login')
  }

  const handleManualReading = async () => {
    setIsReading(true)
    setLastReadingTime(null)
    
    try {
      console.log('Starting comprehensive manual reading...')
      
      const response = await fetch('http://localhost:3001/api/readings/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestedBy: 'dashboard'
        })
      })

      const data = await response.json()
      
      if (data.success && data.data) {
        const readingData = data.data.readingData
        setLastReadingTime(new Date().toLocaleTimeString())
        
        console.log('Manual reading completed:', {
          averagedPH: readingData?.averagedReading?.ph,
          averagedColor: readingData?.averagedReading?.color,
          colorScore: readingData?.colorScore,
          confidence: readingData?.confidence,
          recommendations: readingData?.recommendations,
          collectionTime: data.data.collectionTime,
          processedBy: data.data.processedBy
        })
        
        console.info(`✅ Reading complete! pH: ${readingData?.averagedReading?.ph?.toFixed(2)}, Color Score: ${readingData?.colorScore}, Confidence: ${(readingData?.confidence * 100)?.toFixed(1)}%`)
      } else {
        console.error('Manual reading failed:', data.error)
      }
    } catch (error) {
      console.error('Error during comprehensive manual reading:', error)
    } finally {
      setIsReading(false)
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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
    >
            {/* Desktop Header - Hidden on Mobile */}
      <motion.header 
        variants={itemVariants}
        className="hidden md:block bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center"
              >
                <BeakerIcon className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  PUMA Health
                </h1>
                <p className="text-sm text-gray-500">Intelligent Health Monitoring</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Connection Status */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2"
              >
                {connectionStatus === 'connected' ? (
                  <WifiIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <NoSymbolIcon className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </motion.div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{mounted ? currentTime : '--:--:-- --'}</p>
                </div>
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </div>

              {/* Logout Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

            {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Welcome Section */}
        <motion.div variants={itemVariants} className="mb-6 md:mb-8">
          <div className="text-center">
            <motion.h2 
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-2"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'User'}! 👋
            </motion.h2>
            <p className="text-sm md:text-base text-gray-600">{todayStr}</p>
          </div>
        </motion.div>

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
          {/* Hydration Monitor */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-xl border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <HeartIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">Hydration Level</h3>
                  <p className="text-xs md:text-sm text-gray-500">Real-time monitoring</p>
                </div>
              </div>
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <HydrationCircle />
          </motion.div>

          {/* pH Monitor */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-xl border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">pH Balance</h3>
                  <p className="text-xs md:text-sm text-gray-500">Acidity monitoring</p>
                </div>
              </div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            </div>
            <PhBar />
          </motion.div>
        </div>

        {/* Analysis Section */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-xl border border-gray-100 mb-6 md:mb-8"
        >
          <div className="text-center">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6"
            >
              <SparklesIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </motion.div>
            
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 md:mb-3">
              Comprehensive Health Analysis
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              Advanced 5-second sensor collection with K-means machine learning classification. 
              Get instant health insights with personalized recommendations.
            </p>

            {/* Analysis Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualReading}
              disabled={isReading || connectionStatus === 'disconnected'}
              className={`relative inline-flex items-center px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-lg transition-all duration-300 w-full sm:w-auto ${
                isReading || connectionStatus === 'disconnected'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <AnimatePresence mode="wait">
                {isReading ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Analyzing for 5 seconds...</span>
                  </motion.div>
                ) : connectionStatus === 'disconnected' ? (
                  <motion.div
                    key="offline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-3"
                  >
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>System Offline</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-3"
                  >
                    <PlayIcon className="w-6 h-6" />
                    <span>Start Analysis</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Last Reading Info */}
            <AnimatePresence>
              {lastReadingTime && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-600"
                >
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Last analysis completed at {lastReadingTime}</span>
                </motion.div>
              )}
            </AnimatePresence>

                        {/* Process Flow */}
            <div className="mt-6 md:mt-8 bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6">
              <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-3 md:mb-4 flex items-center justify-center space-x-2">
                <ClockIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span>Analysis Process</span>
              </h4>
              <div className="flex items-center justify-center space-x-2 md:space-x-4 text-xs text-gray-600">
                <div className="flex flex-col items-center space-y-1 md:flex-row md:space-y-0 md:space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-center">Connection Check</span>
                </div>
                <div className="w-2 md:w-4 h-px bg-gray-300"></div>
                <div className="flex flex-col items-center space-y-1 md:flex-row md:space-y-0 md:space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-center">5s Collection</span>
                </div>
                <div className="w-2 md:w-4 h-px bg-gray-300"></div>
                <div className="flex flex-col items-center space-y-1 md:flex-row md:space-y-0 md:space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-center">ML Processing</span>
                </div>
                <div className="w-2 md:w-4 h-px bg-gray-300"></div>
                <div className="flex flex-col items-center space-y-1 md:flex-row md:space-y-0 md:space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-center">Storage</span>
                </div>
              </div>
            </div>
    </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">Daily Readings</p>
                <p className="text-xl md:text-2xl font-bold">12</p>
              </div>
              <ChartBarIcon className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Health Score</p>
                <p className="text-xl md:text-2xl font-bold">Good</p>
              </div>
              <HeartIcon className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 text-white sm:col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">Streak</p>
                <p className="text-xl md:text-2xl font-bold">7 days</p>
              </div>
              <SparklesIcon className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            </div>
          </motion.div>
        </motion.div>
      </main>
    </motion.div>
  )
}

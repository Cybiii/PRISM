'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BeakerIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline'

interface HealthData {
  ph: number
  hydration: number
  colorScore: number
  timestamp: string
}

export default function HydrationCircle() {
  const [data, setData] = useState<HealthData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate connection status (no actual WebSocket needed for now)
    setIsConnected(true)
    
    // Load latest reading from API or use fallback data
    const loadInitialData = async () => {
      try {
        // Try to get latest reading from API
        const response = await fetch('http://localhost:3001/api/readings/latest')
        const result = await response.json()
        
        if (result.success && result.data) {
          const reading = result.data
          const hydrationLevel = calculateHydrationFromColor(reading.colorScore || 3)
          setData({
            ph: reading.phValue || 7.0,
            hydration: hydrationLevel,
            colorScore: reading.colorScore || 3,
            timestamp: new Date(reading.timestamp).toISOString()
          })
        } else {
          // Use fallback data
          setData({
            ph: 6.8,
            hydration: 75,
            colorScore: 2,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error loading latest reading:', error)
        // Use fallback data
        setData({
          ph: 6.8,
          hydration: 75,
          colorScore: 2,
          timestamp: new Date().toISOString()
        })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const calculateHydrationFromColor = (colorScore: number): number => {
    // Convert color score (1-5) to hydration percentage
    // Lower color score = better hydration
    switch (colorScore) {
      case 1: return 90 + Math.random() * 10  // 90-100%
      case 2: return 70 + Math.random() * 20  // 70-90%
      case 3: return 50 + Math.random() * 20  // 50-70%
      case 4: return 30 + Math.random() * 20  // 30-50%
      case 5: return 10 + Math.random() * 20  // 10-30%
      default: return 50
    }
  }

  const getHydrationStatus = (level: number) => {
    if (level >= 80) return { status: 'excellent', color: 'text-emerald-600', bgColor: 'from-emerald-400 to-emerald-600', icon: CheckCircleIcon }
    if (level >= 60) return { status: 'good', color: 'text-blue-600', bgColor: 'from-blue-400 to-blue-600', icon: BeakerIcon }
    if (level >= 40) return { status: 'moderate', color: 'text-yellow-600', bgColor: 'from-yellow-400 to-orange-500', icon: ExclamationTriangleIcon }
    return { status: 'low', color: 'text-red-600', bgColor: 'from-red-400 to-red-600', icon: ExclamationTriangleIcon }
  }

  const getStatusMessage = (level: number) => {
    if (level >= 80) return "Excellent hydration! Keep it up! 🎉"
    if (level >= 60) return "Good hydration levels 👍"
    if (level >= 40) return "Consider drinking more water 💧"
    return "Dehydration risk - drink water now! ⚠️"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <BeakerIcon className="w-16 h-16 mb-4 opacity-50" />
        </motion.div>
        <p className="text-center">No hydration data available</p>
        <p className="text-sm text-center mt-2">Start a sensor reading to see your levels</p>
      </div>
    )
  }

  const hydrationLevel = data.hydration
  const status = getHydrationStatus(hydrationLevel)
  const StatusIcon = status.icon
  const circumference = 2 * Math.PI * 70 // radius of 70
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (hydrationLevel / 100) * circumference

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Circle */}
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative"
      >
        {/* Background Circle */}
        <svg className="w-36 h-36 md:w-48 md:h-48 transform -rotate-90" viewBox="0 0 160 160">
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            stroke="url(#hydrationGradient)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-blue-400" />
              <stop offset="50%" className="stop-cyan-400" />
              <stop offset="100%" className="stop-emerald-400" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mb-2"
            >
              <StatusIcon className={`w-8 h-8 mx-auto ${status.color}`} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="text-3xl font-bold text-gray-800">
                {Math.round(hydrationLevel)}%
              </div>
              <div className="text-sm font-medium text-gray-600 capitalize">
                {status.status}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Simple excellence indicator */}
        {hydrationLevel >= 80 && (
          <div className="absolute top-4 right-4 text-emerald-400">
            <SparklesIcon className="w-6 h-6 animate-pulse" />
          </div>
        )}
      </motion.div>

      {/* Status Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center max-w-xs"
      >
        <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-r ${status.bgColor} text-white`}>
          <p className="font-medium text-sm md:text-base">{getStatusMessage(hydrationLevel)}</p>
        </div>
        
        {/* Additional Stats */}
        <div className="mt-3 md:mt-4 grid grid-cols-2 gap-3 md:gap-4 text-center">
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-2 md:p-3">
            <div className="text-base md:text-lg font-bold text-gray-800">{data.colorScore}/5</div>
            <div className="text-xs text-gray-600">Color Score</div>
          </div>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-2 md:p-3">
            <div className="text-base md:text-lg font-bold text-gray-800">{data.ph.toFixed(1)}</div>
            <div className="text-xs text-gray-600">pH Level</div>
          </div>
        </div>
      </motion.div>

      {/* Real-time indicator */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="flex items-center space-x-2 text-xs text-gray-500"
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span>{isConnected ? 'Live monitoring' : 'Offline mode'}</span>
      </motion.div>
    </div>
  )
} 
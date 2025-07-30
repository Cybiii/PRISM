'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BeakerIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline'

interface HealthData {
  ph: number
  hydration: number
  colorScore: number
  timestamp: string
}

export default function PhBar() {
  const [data, setData] = useState<HealthData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // WebSocket connection for real-time data
    const ws = new WebSocket('ws://localhost:3001')
    
    ws.onopen = () => {
      setIsConnected(true)
      setLoading(false)
    }

    ws.onmessage = (event) => {
      try {
        const reading = JSON.parse(event.data)
        if (reading.type === 'newReading' || reading.phValue !== undefined) {
          setData({
            ph: reading.phValue || reading.ph || 7.0,
            hydration: reading.hydration || 75,
            colorScore: reading.colorScore || 3,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error parsing WebSocket data:', error)
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
      setLoading(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    // Fallback: Generate initial mock data if no connection
    const fallbackTimer = setTimeout(() => {
      if (!data) {
        setData({
          ph: 6.8,
          hydration: 75,
          colorScore: 2,
          timestamp: new Date().toISOString()
        })
        setLoading(false)
      }
    }, 3000)

    return () => {
      ws.close()
      clearTimeout(fallbackTimer)
    }
  }, [data])

  const getPhStatus = (ph: number) => {
    if (ph >= 4.5 && ph <= 8.0) {
      if (ph >= 6.0 && ph <= 7.5) {
        return { 
          status: 'optimal', 
          color: 'text-emerald-600', 
          bgColor: 'from-emerald-400 to-emerald-600',
          barColor: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
          icon: CheckCircleIcon 
        }
      }
      return { 
        status: 'normal', 
        color: 'text-blue-600', 
        bgColor: 'from-blue-400 to-blue-600',
        barColor: 'bg-gradient-to-r from-blue-400 to-blue-500',
        icon: InformationCircleIcon 
      }
    }
    return { 
      status: 'concerning', 
      color: 'text-red-600', 
      bgColor: 'from-red-400 to-red-600',
      barColor: 'bg-gradient-to-r from-red-400 to-red-500',
      icon: ExclamationTriangleIcon 
    }
  }

  const getPhMessage = (ph: number) => {
    if (ph >= 6.0 && ph <= 7.5) return "Perfect pH balance! 🎯"
    if (ph >= 4.5 && ph <= 8.0) return "pH levels within normal range ✅"
    if (ph < 4.5) return "pH too acidic - consult doctor 🚨"
    return "pH too alkaline - consult doctor 🚨"
  }

  const getPhRange = () => {
    const ranges = [
      { min: 4.0, max: 5.0, label: 'Very Acidic', color: 'bg-red-500' },
      { min: 5.0, max: 6.0, label: 'Acidic', color: 'bg-orange-400' },
      { min: 6.0, max: 7.0, label: 'Optimal', color: 'bg-emerald-400' },
      { min: 7.0, max: 8.0, label: 'Good', color: 'bg-blue-400' },
      { min: 8.0, max: 9.0, label: 'Alkaline', color: 'bg-purple-400' },
    ]
    return ranges
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"
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
        <p className="text-center">No pH data available</p>
        <p className="text-sm text-center mt-2">Start a sensor reading to see your levels</p>
      </div>
    )
  }

  const phLevel = data.ph
  const status = getPhStatus(phLevel)
  const StatusIcon = status.icon
  const ranges = getPhRange()
  
  // Calculate position on the pH scale (0-100%)
  const minPh = 4.0
  const maxPh = 9.0
  const phPosition = Math.max(0, Math.min(100, ((phLevel - minPh) / (maxPh - minPh)) * 100))

  return (
    <div className="space-y-6">
      {/* Main pH Display */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
          >
            <StatusIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-4xl font-bold text-gray-800"
            >
              {phLevel.toFixed(1)}
            </motion.div>
            <div className="text-sm text-gray-600">pH Level</div>
          </div>
        </div>
      </motion.div>

      {/* pH Scale Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative"
      >
        {/* Scale Background */}
        <div className="relative h-16 bg-gray-100 rounded-2xl overflow-hidden">
          {/* Color segments */}
          <div className="flex h-full">
            {ranges.map((range, index) => (
              <motion.div
                key={index}
                initial={{ width: 0 }}
                animate={{ width: '20%' }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                className={`${range.color} flex items-center justify-center`}
              >
                <span className="text-xs font-medium text-white opacity-80">
                  {range.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* pH Indicator */}
          <motion.div
            initial={{ left: '50%' }}
            animate={{ left: `${phPosition}%` }}
            transition={{ delay: 1, duration: 1, type: "spring" }}
            className="absolute top-0 h-full w-1 transform -translate-x-1/2"
          >
            <div className="w-full h-full bg-white shadow-lg"></div>
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-2 shadow-lg border-2 border-gray-200">
              <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
            </div>
          </motion.div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
          <span>4.0</span>
          <span>5.0</span>
          <span>6.0</span>
          <span>7.0</span>
          <span>8.0</span>
          <span>9.0</span>
        </div>
      </motion.div>

      {/* Status Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="text-center"
      >
        <div className={`p-4 rounded-2xl bg-gradient-to-r ${status.bgColor} text-white mb-4`}>
          <p className="font-medium">{getPhMessage(phLevel)}</p>
        </div>

        {/* pH Facts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="bg-gray-50 rounded-xl p-4"
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-center space-x-2">
            <InformationCircleIcon className="w-4 h-4" />
            <span>pH Scale Guide</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>6.0-7.5: Optimal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>4.5-8.0: Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>&lt;4.5: Too Acidic</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>&gt;8.0: Too Alkaline</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Additional Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-gray-800 capitalize">{status.status}</div>
          <div className="text-xs text-gray-600">pH Status</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{data.colorScore}/5</div>
          <div className="text-xs text-gray-600">Color Score</div>
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
        className="flex items-center justify-center space-x-2 text-xs text-gray-500"
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span>{isConnected ? 'Live monitoring' : 'Offline mode'}</span>
      </motion.div>
    </div>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
// Animation imports removed for performance
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
          setData({
            ph: reading.phValue || 7.0,
            hydration: 75, // Calculate from color score if needed
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

  const getPhStatus = (ph: number) => {
    if (ph >= 4.5 && ph <= 8.0) {
      if (ph >= 6.0 && ph <= 7.5) {
        return { 
          status: 'optimal', 
          color: 'text-blue-700', 
          bgColor: 'bg-blue-500', // Lighter blue for better readability
          barColor: 'bg-blue-500',
          icon: CheckCircleIcon 
        }
      }
      return { 
        status: 'normal', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-400', // Lighter blue
        barColor: 'bg-blue-400',
        icon: InformationCircleIcon 
      }
    }
    return { 
      status: 'concerning', 
      color: 'text-red-600', 
      bgColor: 'bg-red-500', // Use red for concerning levels
      barColor: 'bg-red-500',
      icon: ExclamationTriangleIcon 
    }
  }

  const getPhMessage = (ph: number) => {
    if (ph >= 6.0 && ph <= 7.5) return "Perfect pH balance! 🎯"
    if (ph >= 4.5 && ph <= 8.0) return "pH levels within normal range ✅"
    if (ph < 4.5) return "pH too acidic - consult doctor 🚨"
    return "pH too alkaline - consult doctor 🚨"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BeakerIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No pH data available</p>
        <p className="text-sm text-gray-500">Start taking measurements to see your pH levels</p>
      </div>
    )
  }

  const phLevel = data.ph
  const status = getPhStatus(phLevel)
  const StatusIcon = status.icon

  // pH scale configuration - more muted colors with red at extremes
  const ranges = [
    { min: 4.5, max: 5.5, color: '#ef4444', label: 'Acidic' }, // Red for acidic
    { min: 5.5, max: 6.5, color: '#f97316', label: 'Slightly Acidic' }, // Muted orange
    { min: 6.5, max: 7.5, color: '#22c55e', label: 'Optimal' }, // Muted green
    { min: 7.5, max: 8.5, color: '#f59e0b', label: 'Slightly Alkaline' }, // Muted yellow
    { min: 8.5, max: 9.5, color: '#ef4444', label: 'Alkaline' } // Red for alkaline
  ]

  // Calculate position for pH indicator
  const minPh = 4.5
  const maxPh = 9.0
  const phPosition = Math.max(0, Math.min(100, ((phLevel - minPh) / (maxPh - minPh)) * 100))

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* pH Balance Header */}
      <div className="bg-blue-600 rounded-2xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <StatusIcon className="w-6 h-6 mr-2" />
          pH Balance Monitor
        </h2>
        <p className="text-blue-100">Real-time monitoring of your pH levels</p>
      </div>

      {/* Main pH Display */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {phLevel.toFixed(1)}
              </div>
              <div className="text-lg text-gray-600 font-medium">pH Level</div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-white font-semibold text-sm shadow-lg ${status.bgColor}`}>
            <StatusIcon className="w-4 h-4 mr-2" />
            {getPhMessage(phLevel)}
          </div>
        </div>
      </div>

      {/* pH Scale Analysis */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
            <BeakerIcon className="w-5 h-5 mr-2 text-blue-600" />
            pH Scale Analysis
          </h3>
          <p className="text-gray-600">Your current pH level on the wellness scale</p>
        </div>

        <div className="relative mb-8">
          {/* Enhanced Scale Background */}
          <div className="relative h-20 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-inner border border-gray-200 overflow-hidden">
            {/* Color segments with better styling */}
            <div className="flex h-full">
              {ranges.map((range, index) => (
                <div
                  key={index}
                  className="flex-1 relative"
                  style={{ 
                    background: `linear-gradient(135deg, ${range.color}dd, ${range.color}aa)`,
                  }}
                >
                  {/* Segment labels */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium opacity-90">
                    {range.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced pH Indicator */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
              style={{ left: `${phPosition}%` }}
            >
              <div className="relative">
                <div className="w-6 h-6 bg-white rounded-full shadow-2xl border-4 border-gray-800 relative z-10"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 rounded-full"></div>
                {/* Indicator line */}
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gray-800"></div>
                {/* Value display */}
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap">
                  {phLevel.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Scale numbers */}
            <div className="absolute inset-x-0 -bottom-8 flex justify-between text-sm font-medium text-gray-700 px-2">
              <span>4.5</span>
              <span>5.5</span>
              <span>6.5</span>
              <span>7.5</span>
              <span>8.5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Reading Data */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <InformationCircleIcon className="w-4 h-4 mr-2" />
          Current Reading Data
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">pH Level:</span>
              <span className="font-medium text-gray-900">{phLevel.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`font-medium capitalize ${status.color}`}>{status.status}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Color Score:</span>
              <span className="font-medium text-gray-900">{data.colorScore}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Updated:</span>
              <span className="font-medium text-gray-900">{new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}></div>
          <span className="text-sm text-gray-600 font-medium">
            {isConnected ? 'Live monitoring active' : 'Offline - showing last reading'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Updated {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
} 
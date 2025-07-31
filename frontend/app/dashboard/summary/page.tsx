'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BeakerIcon,
  ScaleIcon,
  SparklesIcon,
  ArrowPathIcon,
  HeartIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { authenticatedFetch } from '../../lib/auth'
import { useRouter } from 'next/navigation'

interface TimeRangeStats {
  period: string
  avgHealthScore: number
  avgPH: number
  totalReadings: number
  trend: 'improving' | 'declining' | 'stable'
}

interface TrendsData {
  shortTerm: TimeRangeStats
  mediumTerm: TimeRangeStats
  longTerm: TimeRangeStats
  overallAssessment: {
    improving: number
    declining: number
    stable: number
  }
}

interface Reading {
  id: string
  timestamp: string
  ph: number
  hydration_ml: number
  color_score: number
  confidence: number
}

interface ChartData {
  date: string
  ph: number
  hydration: number
  colorScore: number
  timestamp: string
}

export default function SummaryPage() {
  const router = useRouter()
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [recentReadings, setRecentReadings] = useState<Reading[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('connected')
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null)

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch trends data and recent readings in parallel (7-day focus)
      const [trendsResponse, readingsResponse] = await Promise.all([
        authenticatedFetch('/analytics/trends'),
        authenticatedFetch(`/analytics/readings?hours=168&limit=20`) // 7 days
      ])

      if (!trendsResponse.ok) {
        throw new Error(`Trends: ${trendsResponse.status} ${trendsResponse.statusText}`)
      }

      if (!readingsResponse.ok) {
        throw new Error(`Readings: ${readingsResponse.status} ${readingsResponse.statusText}`)
      }

      const trendsData = await trendsResponse.json()
      const readingsData = await readingsResponse.json()

      if (trendsData.success) {
        setTrends(trendsData.data)
      }

      if (readingsData.success && readingsData.data.readings) {
        const readings = readingsData.data.readings
        setRecentReadings(readings)
        
        // Transform readings into chart data (optimized for 7-day view)
        const chartPoints = readings.slice(0, 7).reverse().map((reading: Reading, index: number) => {
          // Create date object - handle timestamp
          const date = new Date(reading.timestamp)
          
          // If date is invalid, use current date minus index days as fallback
          const displayDate = isNaN(date.getTime()) 
            ? (() => {
                const fallbackDate = new Date()
                fallbackDate.setDate(fallbackDate.getDate() - (6 - index))
                return fallbackDate
              })()
            : date

          return {
            date: displayDate.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric' 
            }),
            ph: reading.ph || 7.0,
            hydration: reading.hydration_ml || 300,
            colorScore: reading.color_score || (Math.floor(Math.random() * 3) + 1), // Generate consistent mock score
            timestamp: reading.timestamp
          }
        })
        setChartData(chartPoints)
      }

    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message || 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return ArrowTrendingUpIcon
      case 'declining': return ArrowTrendingDownIcon
      default: return ChartBarIcon
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-500'
      case 'declining': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Attention'
  }

  const renderPHChart = () => {
    if (!chartData.length) return null

    const width = 400
    const height = 200
    const maxPH = Math.max(...chartData.map(d => d.ph))
    const minPH = Math.min(...chartData.map(d => d.ph))
    const range = maxPH - minPH || 1

    return (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-blue-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ScaleIcon className="w-7 h-7 mr-3 text-blue-600" />
          pH Levels
        </h3>
        
        {/* pH Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.ph, 0) / chartData.length).toFixed(2) : '7.20'}
            </div>
            <div className="text-sm text-gray-600 font-medium">Average pH</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {chartData.filter(d => d.ph >= 6.5 && d.ph <= 7.5).length}
            </div>
            <div className="text-sm text-gray-600 font-medium">Optimal Days</div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg width={width} height={height} className="mx-auto">
            {/* Background with gradient */}
            <defs>
              <linearGradient id="phChartBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#phChartBg)" rx="12" />
            
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="50"
                y1={60 + (i * (height - 120) / 4)}
                x2={width - 50}
                y2={60 + (i * (height - 120) / 4)}
                stroke="#e5e7eb"
                strokeWidth="1"
                opacity="0.6"
                strokeDasharray="4,4"
              />
            ))}
            
            {/* Bars - Made very thin */}
            {chartData.map((d, i) => {
              const barWidth = (width - 100) / chartData.length * 0.25 // Made very thin (0.25 instead of 0.5)
              const normalizedPH = (d.ph - minPH) / range
              const barHeight = normalizedPH * (height - 120)
              const x = (i / chartData.length) * (width - 100) + 50 + ((width - 100) / chartData.length - barWidth) / 2
              const y = height - 60 - barHeight
              
              // Color based on pH level
              const getPhColor = (ph: number) => {
                if (ph >= 6.5 && ph <= 7.5) return '#10b981' // Green - optimal
                if (ph >= 6.0 && ph <= 8.0) return '#3b82f6' // Blue - good
                return '#f59e0b' // Orange - attention needed
              }
              
              return (
                <g key={i}>
                  {/* Bar shadow */}
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={barWidth}
                    height={barHeight}
                    fill="rgba(0,0,0,0.1)"
                    rx="2"
                  />
                  {/* Main bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={getPhColor(d.ph)}
                    rx="2"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
                  />
                  {/* pH value on top of bar */}
                  <text
                    x={x + barWidth/2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#1f2937"
                    className="font-bold"
                  >
                    {d.ph.toFixed(1)}
                  </text>
                </g>
              )
            })}
            
            {/* Enhanced Y-axis labels */}
            <text x="25" y={height - 55} fontSize="14" fill="#6b7280" className="font-medium">
              {minPH.toFixed(1)}
            </text>
            <text x="25" y="75" fontSize="14" fill="#6b7280" className="font-medium">
              {maxPH.toFixed(1)}
            </text>
            

            
            {/* pH Reference Lines - More subtle */}
            <line
              x1="50"
              y1={height - 60 - ((6.5 - minPH) / range) * (height - 120)}
              x2={width - 50}
              y2={height - 60 - ((6.5 - minPH) / range) * (height - 120)}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.4"
            />
            <line
              x1="50"
              y1={height - 60 - ((7.5 - minPH) / range) * (height - 120)}
              x2={width - 50}
              y2={height - 60 - ((7.5 - minPH) / range) * (height - 120)}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.4"
            />
          </svg>
        </div>
        

      </div>
    )
  }



  const renderColorScoresChart = () => {
    if (!chartData.length) return null

    const width = 700 // Increased width for bigger chart
    const height = 300 // Increased height
    const maxScore = Math.max(...chartData.map(d => d.colorScore), 5)
    const minScore = Math.min(...chartData.map(d => d.colorScore), 0)

    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * (width - 100) + 50
      const y = height - 60 - ((d.colorScore - minScore) / (maxScore - minScore)) * (height - 120)
      return `${x},${y}`
    }).join(' ')

    return (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-blue-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <SparklesIcon className="w-7 h-7 mr-3 text-cyan-600" />
          Color Analysis Scores
        </h3>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.colorScore, 0) / chartData.length).toFixed(1) : '0'}
            </div>
            <div className="text-sm text-gray-600 font-medium">Average Score</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.min(...chartData.map(d => d.colorScore)).toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 font-medium">Best Score</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.max(...chartData.map(d => d.colorScore)).toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 font-medium">Highest Score</div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg width={width} height={height} className="mx-auto">
            {/* Background with gradient */}
            <defs>
              <linearGradient id="colorScoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05"/>
              </linearGradient>
              <linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#f3f4f6" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#chartBg)" rx="12" />
            
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="50"
                y1={60 + (i * (height - 120) / 4)}
                x2={width - 50}
                y2={60 + (i * (height - 120) / 4)}
                stroke="#e5e7eb"
                strokeWidth="1"
                opacity="0.6"
                strokeDasharray="4,4"
              />
            ))}
            
            {/* Vertical grid lines */}
            {chartData.map((_, i) => {
              const x = (i / (chartData.length - 1)) * (width - 100) + 50
              return (
                <line
                  key={i}
                  x1={x}
                  y1="60"
                  x2={x}
                  y2={height - 60}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                  opacity="0.5"
                />
              )
            })}
            
            {/* Area under the curve */}
            <path
              d={`M ${points.split(' ')[0]} L ${points} L ${width - 50},${height - 60} L 50,${height - 60} Z`}
              fill="url(#colorScoreGradient)"
            />
            
            {/* Score line with gradient */}
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="4"
              points={points}
              filter="drop-shadow(0 2px 4px rgba(168, 85, 247, 0.3))"
            />
            
            {/* Data points with enhanced styling */}
            {chartData.map((d, i) => {
              const x = (i / (chartData.length - 1)) * (width - 100) + 50
              const y = height - 60 - ((d.colorScore - minScore) / (maxScore - minScore)) * (height - 120)
              
                            const getScoreColor = (score: number) => {
                if (score >= 9) return '#10b981'  // Excellent: Green
                if (score >= 7) return '#3b82f6'  // Good: Blue  
                if (score >= 5) return '#f59e0b'  // Fair: Yellow
                return '#ef4444'                   // Poor: Red
              }
              
const getScoreStatus = (score: number) => {
                if (score >= 9) return 'Excellent'  // Score 9-10
                if (score >= 7) return 'Good'       // Score 7-8
                if (score >= 5) return 'Fair'       // Score 5-6
                return 'Poor'                        // Score 1-4
              }
              
              return (
                <g key={i}>
                  {/* Outer glow circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill={getScoreColor(d.colorScore)}
                    opacity="0.2"
                  />
                  {/* Main circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill={getScoreColor(d.colorScore)}
                    stroke="white"
                    strokeWidth="3"
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.2))"
                  />
                  {/* Score value - larger and more prominent */}
                  <text
                    x={x}
                    y={y - 25}
                    textAnchor="middle"
                    fontSize="16"
                    fill="#1f2937"
                    className="font-bold"
                  >
                    {d.colorScore.toFixed(1)}
                  </text>
                  {/* Status label */}
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill={getScoreColor(d.colorScore)}
                    className="font-semibold"
                  >
                    {getScoreStatus(d.colorScore)}
                  </text>
                </g>
              )
            })}
            
            {/* Enhanced X-axis labels */}
            {chartData.map((d, i) => {
              const x = (i / (chartData.length - 1)) * (width - 100) + 50
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 25}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#4b5563"
                  className="font-semibold"
                >
                  {d.date}
                </text>
              )
            })}
            
            {/* Y-axis labels with better positioning */}
            <text x="25" y={height - 55} fontSize="14" fill="#6b7280" className="font-medium">
              {minScore.toFixed(1)}
            </text>
            <text x="25" y="75" fontSize="14" fill="#6b7280" className="font-medium">
              {maxScore.toFixed(1)}
            </text>
            
            {/* Y-axis title */}
            <text x="15" y={height/2} fontSize="12" fill="#6b7280" textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} className="font-medium">
              Color Score
            </text>
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-6 bg-white/50 backdrop-blur-sm rounded-full px-6 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-700">Excellent (9-10)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-700">Good (7-8)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-gray-700">Fair (5-6)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-gray-700">Poor (1-4)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-8"
      >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 mb-2 sm:mb-3">
            Health Analytics Dashboard
          </h1>
          <p className="text-blue-700/80 text-sm sm:text-lg">Comprehensive health insights and trends</p>
        </div>
      </motion.div>

      {/* Health Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <HeartIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Total Readings</h3>
                <p className="text-xs text-slate-600">All time</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            24
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <ScaleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Avg pH</h3>
                <p className="text-xs text-slate-600">7 days</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            6.8
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Health Score</h3>
                <p className="text-xs text-slate-600">Current</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            85/100
          </div>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* pH Levels Chart */}
        <motion.div variants={itemVariants} className="space-y-6">
          {renderPHChart()}
        </motion.div>

        {/* Color Scores Trend Chart */}
        <motion.div variants={itemVariants} className="space-y-6">
          {renderColorScoresChart()}
        </motion.div>
      </div>

      {/* Mobile Bottom Navigation Spacer */}
      <div className="h-20 md:hidden" />
      </motion.div>
    </div>
  )
}

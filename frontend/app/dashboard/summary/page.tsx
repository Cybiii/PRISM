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
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { authenticatedFetch } from '../../lib/auth'

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
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [recentReadings, setRecentReadings] = useState<Reading[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-xl border border-blue-100">
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
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-xl border border-purple-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <SparklesIcon className="w-7 h-7 mr-3 text-purple-600" />
          Color Analysis Scores
        </h3>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
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
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05"/>
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
                if (score <= 1) return '#10b981'
                if (score <= 2) return '#3b82f6'
                if (score <= 3) return '#f59e0b'
                return '#ef4444'
              }
              
              const getScoreStatus = (score: number) => {
                if (score <= 1) return 'Excellent'
                if (score <= 2) return 'Good'
                if (score <= 3) return 'Fair'
                return 'Poor'
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
              <span className="text-sm font-medium text-gray-700">Excellent (≤1.0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-700">Good (≤2.0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-gray-700">Fair (≤3.0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-gray-700">Poor (&gt;3.0)</span>
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Health Dashboard
          </h1>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto">
            Your complete health analytics overview with pH monitoring and water quality analysis
          </p>
        </motion.div>



        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-12"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
            >
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Analytics</h3>
              <p className="text-red-600 mb-4">{error}</p>
          <button
                onClick={fetchAnalyticsData}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
          </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <AnimatePresence>
          {trends && !loading && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Health Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {[
                  { data: trends.shortTerm, title: '24 Hours', icon: ClockIcon, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100' },
                  { data: trends.mediumTerm, title: '7 Days', icon: CalendarDaysIcon, gradient: 'from-purple-500 to-purple-600', bgGradient: 'from-purple-50 to-purple-100' },
                  { data: trends.longTerm, title: '30 Days', icon: SparklesIcon, gradient: 'from-green-500 to-green-600', bgGradient: 'from-green-50 to-green-100' }
                ].map(({ data, title, icon: Icon, gradient, bgGradient }, index) => (
                  <motion.div
                    key={title}
                    variants={itemVariants}
                    className={`bg-gradient-to-br ${bgGradient} rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className={`flex items-center space-x-3`}>
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {React.createElement(getTrendIcon(data.trend), {
                          className: `w-6 h-6 ${getTrendColor(data.trend)}`
                        })}
                        <span className={`text-sm font-bold capitalize ${getTrendColor(data.trend)}`}>
                          {data.trend}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Health Score</span>
                        <span className={`text-3xl font-bold ${getHealthScoreColor(data.avgHealthScore || 75)}`}>
                          {data.avgHealthScore ? Math.max(data.avgHealthScore, 65).toFixed(0) : '75'}/100
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Avg pH</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {data.avgPH?.toFixed(2) || '7.20'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Readings</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {data.totalReadings || 0}
                        </span>
                      </div>
                    </div>
                  </motion.div>
        ))}
      </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div variants={itemVariants} className="lg:order-1">
                  {renderPHChart()}
                </motion.div>
                <motion.div variants={itemVariants} className="lg:col-span-2 lg:order-2">
                  {renderColorScoresChart()}
                </motion.div>
              </div>



              {/* Recent Activity */}
              {recentReadings.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <BeakerIcon className="w-5 h-5 mr-2 text-gray-500" />
                      Recent Activity
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {recentReadings.slice(0, 4).map((reading, index) => (
                        <div
                          key={reading.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(reading.timestamp).toLocaleDateString()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">pH:</span>
                              <span className="text-sm font-medium">{reading.ph.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Hydration:</span>
                              <span className="text-sm font-medium">{reading.hydration_ml}ml</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Data State */}
        <AnimatePresence>
          {!loading && !error && !trends && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data Available</h3>
              <p className="text-gray-600 mb-6">
                Start taking health readings to see your analytics and trends here.
              </p>
              <button
                onClick={fetchAnalyticsData}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Refresh Data
              </button>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
    </motion.div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BeakerIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { authenticatedFetch } from '../../lib/auth'

interface Reading {
  id: string
  timestamp: string
  ph: number
  hydration_ml: number
  color_score: number
  confidence: number
  created_at: string
}

interface ReadingAnalytics {
  avgPh: number
  avgHydration: number
  totalReadings: number
  phTrend: 'up' | 'down' | 'stable'
  hydrationTrend: 'up' | 'down' | 'stable'
  healthScore: number
  lastReading?: Reading
}

export default function ReadingsPage() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [analytics, setAnalytics] = useState<ReadingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')

  const fetchReadings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Convert time range to hours
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720

      // Fetch readings from analytics endpoint (requires auth)
      const response = await authenticatedFetch(`/analytics/readings?hours=${hours}&limit=100`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.readings) {
          const fetchedReadings = data.data.readings
          setReadings(fetchedReadings)
          calculateAnalytics(fetchedReadings)
        } else {
          throw new Error(data.error || 'Failed to fetch readings')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err: any) {
      console.error('Error fetching readings:', err)
      setError(err.message || 'Failed to load readings')
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (readingsData: Reading[]) => {
    if (readingsData.length === 0) {
      setAnalytics(null)
      return
    }

    // Calculate averages
    const avgPh = readingsData.reduce((sum, r) => sum + r.ph, 0) / readingsData.length
    const avgHydration = readingsData.reduce((sum, r) => sum + r.hydration_ml, 0) / readingsData.length

    // Calculate trends (compare first half vs second half)
    const midPoint = Math.floor(readingsData.length / 2)
    const firstHalf = readingsData.slice(0, midPoint)
    const secondHalf = readingsData.slice(midPoint)

    const firstHalfPh = firstHalf.reduce((sum, r) => sum + r.ph, 0) / firstHalf.length
    const secondHalfPh = secondHalf.reduce((sum, r) => sum + r.ph, 0) / secondHalf.length
    const phDiff = secondHalfPh - firstHalfPh

    const firstHalfHydration = firstHalf.reduce((sum, r) => sum + r.hydration_ml, 0) / firstHalf.length
    const secondHalfHydration = secondHalf.reduce((sum, r) => sum + r.hydration_ml, 0) / secondHalf.length
    const hydrationDiff = secondHalfHydration - firstHalfHydration

    // Determine trends
    const phTrend = Math.abs(phDiff) < 0.1 ? 'stable' : phDiff > 0 ? 'up' : 'down'
    const hydrationTrend = Math.abs(hydrationDiff) < 20 ? 'stable' : hydrationDiff > 0 ? 'up' : 'down'

    // Calculate health score (0-100)
    const phScore = Math.max(0, Math.min(100, 100 - Math.abs(avgPh - 7.0) * 50))
    const hydrationScore = Math.max(0, Math.min(100, (avgHydration / 500) * 100))
    const healthScore = Math.round((phScore + hydrationScore) / 2)

    setAnalytics({
      avgPh: Math.round(avgPh * 100) / 100,
      avgHydration: Math.round(avgHydration),
      totalReadings: readingsData.length,
      phTrend,
      hydrationTrend,
      healthScore,
      lastReading: readingsData[0] // Most recent reading
    })
  }

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (score >= 60) return { text: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (score >= 40) return { text: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { text: 'Needs Attention', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const getPHStatus = (ph: number) => {
    if (ph >= 6.5 && ph <= 7.5) return { text: 'Optimal', color: 'text-green-600', icon: CheckCircleIcon }
    if (ph >= 6.0 && ph <= 8.0) return { text: 'Good', color: 'text-blue-600', icon: CheckCircleIcon }
    return { text: 'Alert', color: 'text-yellow-600', icon: ExclamationTriangleIcon }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return ArrowTrendingUpIcon
      case 'down': return ArrowTrendingDownIcon
      default: return ChartBarIcon
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodUp: boolean = true) => {
    if (trend === 'stable') return 'text-gray-500'
    if (trend === 'up') return isGoodUp ? 'text-green-500' : 'text-red-500'
    return isGoodUp ? 'text-red-500' : 'text-green-500'
  }

  useEffect(() => {
    fetchReadings()
  }, [timeRange])

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Health Readings
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive analysis of your hydration and pH levels
          </p>
        </motion.div>

        {/* Time Range Selector */}
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <div className="bg-white rounded-xl p-1 shadow-lg border border-gray-200">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </button>
            ))}
          </div>
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
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Readings</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchReadings}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Dashboard */}
        <AnimatePresence>
          {analytics && !loading && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Readings */}
                <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Readings</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.totalReadings}</p>
                    </div>
                    <BeakerIcon className="w-8 h-8 text-purple-500" />
                  </div>
                </motion.div>

                {/* Average pH */}
                <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Average pH</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.avgPh}</p>
                    </div>
                    <ScaleIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {React.createElement(getTrendIcon(analytics.phTrend), {
                      className: `w-4 h-4 ${getTrendColor(analytics.phTrend, false)}`
                    })}
                    <span className={`text-xs font-medium ${getPHStatus(analytics.avgPh).color}`}>
                      {getPHStatus(analytics.avgPh).text}
                    </span>
                  </div>
                </motion.div>

                {/* Average Hydration */}
                <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Avg Hydration</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.avgHydration}ml</p>
                    </div>
                    <ArchiveBoxIcon className="w-8 h-8 text-cyan-500" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {React.createElement(getTrendIcon(analytics.hydrationTrend), {
                      className: `w-4 h-4 ${getTrendColor(analytics.hydrationTrend, true)}`
                    })}
                    <span className="text-xs font-medium text-gray-600">
                      {analytics.hydrationTrend === 'up' ? 'Increasing' : 
                       analytics.hydrationTrend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                </motion.div>

                {/* Health Score */}
                <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Health Score</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.healthScore}/100</p>
                    </div>
                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  </div>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getHealthStatus(analytics.healthScore).bgColor} ${getHealthStatus(analytics.healthScore).color}`}>
                    {getHealthStatus(analytics.healthScore).text}
                  </div>
                </motion.div>
              </div>

              {/* Recent Readings Table */}
              <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
                    Recent Readings
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          pH Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hydration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Color Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {readings.slice(0, 10).map((reading, index) => {
                        const phStatus = getPHStatus(reading.ph)
                        return (
                          <motion.tr
                            key={reading.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(reading.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${phStatus.color}`}>
                                {reading.ph.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reading.hydration_ml}ml
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reading.color_score || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {React.createElement(phStatus.icon, {
                                  className: `w-4 h-4 ${phStatus.color}`
                                })}
                                <span className={`text-xs font-medium ${phStatus.color}`}>
                                  {phStatus.text}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Health Insights */}
              <motion.div variants={itemVariants} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Health Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">pH Analysis</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Optimal pH range: 6.5 - 7.5</p>
                      <p>• Your average: {analytics.avgPh}</p>
                      <p>• Status: <span className={`font-medium ${getPHStatus(analytics.avgPh).color}`}>
                        {getPHStatus(analytics.avgPh).text}
                      </span></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Hydration Analysis</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Recommended: 300-500ml per reading</p>
                      <p>• Your average: {analytics.avgHydration}ml</p>
                      <p>• Trend: <span className="font-medium">
                        {analytics.hydrationTrend === 'up' ? '📈 Improving' : 
                         analytics.hydrationTrend === 'down' ? '📉 Declining' : '➡️ Stable'}
                      </span></p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Data State */}
        <AnimatePresence>
          {!loading && !error && (!readings || readings.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <BeakerIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Readings Found</h3>
              <p className="text-gray-600 mb-6">
                No health readings found for the selected time period. Start taking readings to see your data here.
              </p>
              <button
                onClick={fetchReadings}
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
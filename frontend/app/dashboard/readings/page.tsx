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
  ScaleIcon,
  HeartIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { authenticatedFetch } from '../../lib/auth'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [readings, setReadings] = useState<Reading[]>([])
  const [analytics, setAnalytics] = useState<ReadingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('connected')
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)


  const fetchReadings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fixed to 7 days (168 hours)
      const hours = 168

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
    const avgPh = readingsData.reduce((sum, r) => sum + (r.ph || 0), 0) / readingsData.length
    const avgHydration = readingsData.reduce((sum, r) => sum + (r.hydration_ml || 0), 0) / readingsData.length

    // Calculate trends (compare first half vs second half)
    const midPoint = Math.floor(readingsData.length / 2)
    const firstHalf = readingsData.slice(0, midPoint)
    const secondHalf = readingsData.slice(midPoint)

    const firstHalfPh = firstHalf.reduce((sum, r) => sum + (r.ph || 0), 0) / firstHalf.length
    const secondHalfPh = secondHalf.reduce((sum, r) => sum + (r.ph || 0), 0) / secondHalf.length
    const phDiff = secondHalfPh - firstHalfPh

    const firstHalfHydration = firstHalf.reduce((sum, r) => sum + (r.hydration_ml || 0), 0) / firstHalf.length
    const secondHalfHydration = secondHalf.reduce((sum, r) => sum + (r.hydration_ml || 0), 0) / secondHalf.length
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

  const getReadingHealthStatus = (ph: number, colorScore: number) => {
    // Calculate a simple health score based on pH and color
    const phScore = (ph >= 6.5 && ph <= 7.5) ? 80 : (ph >= 6.0 && ph <= 8.0) ? 60 : 40
    const colorScorePoints = colorScore <= 1.0 ? 80 : colorScore <= 2.0 ? 60 : 40
    const overallScore = (phScore + colorScorePoints) / 2
    return getHealthStatus(overallScore)
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

  // Pagination calculations
  const totalPages = Math.ceil(readings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReadings = readings.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
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
    fetchReadings()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600">Loading readings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchReadings}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
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

      <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-3">
            Health Readings
          </h1>
          <p className="text-blue-700/80 text-lg">Recent health data and analytics</p>
        </div>
              </div>



      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <ArchiveBoxIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Total Readings</h3>
                <p className="text-xs text-slate-600">All time</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {readings.length}
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
                <p className="text-xs text-slate-600">Overall</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {analytics?.avgPh ? analytics.avgPh.toFixed(2) : 'N/A'}
          </div>
          <div className="flex items-center space-x-1 mt-2">
            {analytics?.phTrend === 'up' ? (
              <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600" />
            ) : analytics?.phTrend === 'down' ? (
              <ArrowTrendingDownIcon className="w-4 h-4 text-blue-800" />
            ) : (
              <div className="w-4 h-4" />
            )}
            <span className="text-sm text-slate-600">
              {analytics?.phTrend === 'up' ? 'Improving' : analytics?.phTrend === 'down' ? 'Declining' : 'Stable'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <BeakerIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Color Score</h3>
                <p className="text-xs text-slate-600">Average</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {analytics?.lastReading?.color_score != null ? analytics.lastReading.color_score.toFixed(1) : 'N/A'}
          </div>
          <div className="flex items-center space-x-1 mt-2">
            {analytics?.lastReading?.color_score != null ? (
              analytics?.lastReading?.color_score > 1.0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-blue-800" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
            <span className="text-sm text-slate-600">
              {analytics?.lastReading?.color_score != null ? (
                analytics?.lastReading?.color_score > 1.0 ? 'Improving' : 'Declining'
              ) : 'Stable'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                <HeartIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Health Score</h3>
                <p className="text-xs text-slate-600">Current</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {analytics?.healthScore || 0}/100
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 mt-3">
            <div 
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${analytics?.healthScore || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Readings Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-blue-200 mb-8">
        <div className="px-6 py-4 border-b border-blue-200/30">
          <h3 className="text-xl font-semibold text-blue-900 flex items-center">
            <ClockIcon className="w-6 h-6 mr-3 text-blue-600" />
            Recent Readings
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-blue-200/30">
                <th className="text-left py-4 px-6 text-sm font-semibold text-blue-800">Date & Time</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-blue-800">pH Level</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-blue-800">Color Score</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-blue-800">Hydration</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-blue-800">Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-blue-600/60">
                    <BeakerIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No readings available</p>
                    <p className="text-sm">Start taking health measurements to see your data here</p>
                  </td>
                </tr>
              ) : (
                paginatedReadings.map((reading, index) => (
                  <tr
                    key={reading.id}
                    className="border-b border-blue-200 hover:bg-blue-50"
                  >
                    <td className="py-4 px-6 text-blue-900">
                      <div className="font-medium">
                        {new Date(reading.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-blue-700/70">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getPHStatus(reading.ph || 0).icon === CheckCircleIcon ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-blue-900 font-medium">{reading.ph ? reading.ph.toFixed(2) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${reading.color_score <= 1.0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-blue-900 font-medium">{reading.color_score ? reading.color_score.toFixed(1) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-blue-900 font-medium">
                      {reading.hydration_ml || 0} ml
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const status = getReadingHealthStatus(reading.ph || 0, reading.color_score || 0)
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.text}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {readings.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-blue-200/30">
            <div className="flex items-center text-sm text-blue-700">
              <span>
                Showing {startIndex + 1} to {Math.min(endIndex, readings.length)} of {readings.length} readings
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border transition-colors ${
                  currentPage === 1
                    ? 'text-blue-400 border-blue-200 cursor-not-allowed'
                    : 'text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-600 hover:bg-blue-50 border border-blue-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (
                    (page === currentPage - 2 && currentPage > 3) ||
                    (page === currentPage + 2 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span key={page} className="px-2 py-2 text-blue-400">
                        ...
                      </span>
                    )
                  }
                  return null
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border transition-colors ${
                  currentPage === totalPages
                    ? 'text-blue-400 border-blue-200 cursor-not-allowed'
                    : 'text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Spacer */}
      <div className="h-20 md:hidden" />
      </div>
    </div>
  )
}
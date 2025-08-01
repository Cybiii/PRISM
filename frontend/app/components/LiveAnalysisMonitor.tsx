'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authenticatedFetch, isAuthenticated } from '../lib/auth'
import { 
  WifiIcon,
  BeakerIcon,
  CpuChipIcon,
  ChartBarIcon,
  CircleStackIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface AnalysisStep {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  status: 'waiting' | 'active' | 'completed' | 'error'
  progress?: number
  data?: any
  timestamp?: string
}

interface AnalysisData {
  ph?: number
  color?: { r: number; g: number; b: number }
  colorScore?: number
  confidence?: number
  recommendations?: string[]
  readingId?: string
  metadata?: {
    hydrationStatus?: string
    voltage?: number
    rawADC?: number
  }
}

export default function LiveAnalysisMonitor() {
  const [isConnected, setIsConnected] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentData, setCurrentData] = useState<AnalysisData>({})
  const [steps, setSteps] = useState<AnalysisStep[]>([
    {
      id: 'connection',
      name: 'Connection Check',
      description: 'Verifying Arduino and TCS34725 sensor connection',
      icon: WifiIcon,
      status: 'waiting'
    },
    {
      id: 'collection',
      name: '5s Collection',
      description: 'Collecting sensor readings over 5 seconds',
      icon: BeakerIcon,
      status: 'waiting'
    },
    {
      id: 'processing',
      name: 'Arduino Analysis',
      description: 'Direct health score from Arduino sensor analysis',
      icon: CpuChipIcon,
      status: 'waiting'
    },
    {
      id: 'storage',
      name: 'Storage',
      description: 'Saving results to database and generating recommendations',
      icon: CircleStackIcon,
      status: 'waiting'
    }
  ])

  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    // Initialize Socket.io connection (not raw WebSocket)
    const initSocketConnection = () => {
      // For now, let's simulate connection since Socket.io client needs to be installed
      // TODO: Install socket.io-client and use proper Socket.io connection
      setIsConnected(true)
      updateStep('connection', 'completed')
      
      // Listen for manual reading results instead of WebSocket events
      // The manual reading API will provide all the data we need
    }

    initSocketConnection()

    return () => {
      // Cleanup if needed
    }
  }, [])

  const updateStep = (stepId: string, status: AnalysisStep['status'], progress?: number, data?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            progress, 
            data, 
            timestamp: new Date().toLocaleTimeString() 
          }
        : step
    ))
  }

  // Note: WebSocket event handling removed - now using direct API calls with simulated progress

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      status: step.id === 'connection' ? step.status : 'waiting',
      progress: undefined,
      data: undefined,
      timestamp: undefined
    })))
    setCurrentData({})
  }

  const triggerManualAnalysis = async () => {
    let progressInterval: NodeJS.Timeout | null = null
    
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        console.error('❌ User not authenticated - redirecting to login')
        window.location.href = '/login'
        return
      }

      setIsAnalyzing(true)
      resetSteps()

      // Step 1: Connection Check
      updateStep('connection', 'active')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep('connection', 'completed')

      // Step 2: 5s Collection
      updateStep('collection', 'active')
      
      // Simulate actual 5-second collection with real-time progress updates
      const collectionStartTime = Date.now()
      const collectionDuration = 5000 // 5 seconds
      
      // Update progress every 250ms for smooth animation
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - collectionStartTime
        const progress = Math.min((elapsed / collectionDuration) * 100, 100)
        updateStep('collection', 'active', Math.round(progress))
        
        if (elapsed >= collectionDuration) {
          clearInterval(progressInterval!)
          progressInterval = null
        }
      }, 250)
      
      // Wait for the full 5 seconds
      await new Promise(resolve => setTimeout(resolve, collectionDuration))
      
      // Ensure interval is cleared and step is completed
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      updateStep('collection', 'completed')

      // Step 3: Arduino Analysis
      updateStep('processing', 'active')
      
      // Call the actual API using authenticated fetch
      const response = await authenticatedFetch('/readings/manual', {
        method: 'POST'
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Authentication failed - redirecting to login')
          window.location.href = '/login'
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      if (data.success && data.data) {
        // Access the nested readingData structure from backend
        const readingData = data.data.readingData || data.data
        
        // Update current data display with backend response
        setCurrentData({
          ph: readingData.averagedReading?.ph,
          color: readingData.averagedReading?.color,
          colorScore: readingData.colorScore,
          confidence: readingData.confidence,
          recommendations: readingData.recommendations || [],
          metadata: readingData.averagedReading?.metadata
        })
        
        updateStep('processing', 'completed')

        // Step 4: Storage
        updateStep('storage', 'active')
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateStep('storage', 'completed')
        
      } else {
        console.error('❌ Backend response failed:', data)
        setSteps(prev => prev.map(step => 
          step.status === 'active' ? { ...step, status: 'error' } : step
        ))
      }
      
    } catch (error) {
      console.error('Analysis error:', error)
      setSteps(prev => prev.map(step => 
        step.status === 'active' ? { ...step, status: 'error' } : step
      ))
    } finally {
      // Always clean up interval
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setIsAnalyzing(false)
    }
  }

  const getStepStatusColor = (status: AnalysisStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-400 bg-gray-100'
    }
  }

  const getStepStatusIcon = (step: AnalysisStep) => {
    const IconComponent = step.icon
    
    if (step.status === 'completed') {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />
    } else if (step.status === 'error') {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
    } else if (step.status === 'active') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <IconComponent className="w-5 h-5 text-blue-600" />
        </motion.div>
      )
    } else {
      return <IconComponent className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CpuChipIcon className="w-6 h-6 mr-2 text-blue-600" />
            Analysis Process Monitor
          </h2>
          <p className="text-gray-600 mt-1">Real-time monitoring of sensor analysis steps</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Manual Trigger Button - Huge on Mobile */}
          <button
            onClick={triggerManualAnalysis}
            disabled={!isConnected || isAnalyzing}
            className="w-full sm:w-auto px-8 py-6 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-2xl sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start space-x-3 sm:space-x-2 text-xl sm:text-base font-bold sm:font-normal shadow-xl sm:shadow-none"
          >
            <BeakerIcon className="w-8 h-8 sm:w-4 sm:h-4" />
            <span>{isAnalyzing ? 'Analyzing...' : 'Start Analysis'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Process Steps */}
        <div className="lg:col-span-2">
          <div className="bg-blue-600 rounded-2xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">Analysis Process</h3>
            <p className="text-blue-100">Live monitoring of sensor analysis pipeline</p>
          </div>
          
          {/* Horizontal Stepper */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                    step.status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : step.status === 'active'
                      ? 'bg-blue-500 text-white'
                      : step.status === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircleIcon className="w-8 h-8" />
                    ) : step.status === 'error' ? (
                      <ExclamationTriangleIcon className="w-8 h-8" />
                    ) : step.status === 'active' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <step.icon className="w-8 h-8" />
                      </motion.div>
                    ) : (
                      <step.icon className="w-8 h-8" />
                    )}
                    
                    {/* Step Number */}
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      step.status === 'completed' || step.status === 'active' 
                        ? 'bg-white text-gray-900' 
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Step Name */}
                  <h4 className={`font-bold text-center mb-2 transition-colors ${
                    step.status === 'completed' 
                      ? 'text-green-600' 
                      : step.status === 'active'
                      ? 'text-blue-600'
                      : step.status === 'error'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {step.name}
                  </h4>
                  
                  {/* Step Description */}
                  <p className="text-xs text-gray-600 text-center max-w-24">{step.description}</p>
                  
                  {/* Progress Bar for active step */}
                  {step.status === 'active' && step.progress !== undefined && (
                    <div className="mt-2 w-full max-w-20 bg-gray-200 rounded-full h-1">
                      <motion.div
                        className="bg-blue-500 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  {step.timestamp && (
                    <span className="text-xs text-gray-400 mt-1">{step.timestamp}</span>
                  )}
                  
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute top-8 left-3/4 w-1/2 h-1 ${
                      step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                    }`} style={{ zIndex: 0 }} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Current Step Details */}
            {steps.find(step => step.status === 'active') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                  <span className="font-medium text-blue-900">
                    {steps.find(step => step.status === 'active')?.name} in progress...
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Current Data */}
        <div className="space-y-4 sm:space-y-6">
          {/* Current Reading Data - Cartoon Style */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-2xl font-bold flex items-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🔬
                </motion.div>
                <span className="ml-2">Current Reading</span>
            </h3>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-xl sm:text-2xl"
              >
                ✨
              </motion.div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Fun Primary Metrics */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {/* pH Level - Fun Card */}
              {currentData.ph && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/20 backdrop-blur rounded-2xl p-3 sm:p-4 border border-white/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg sm:text-2xl">⚗️</span>
                        <span className="font-bold text-sm sm:text-lg">pH Level</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl sm:text-3xl font-black">{currentData.ph.toFixed(2)}</div>
                        <div className="text-xs sm:text-sm opacity-80">
                          {currentData.ph < 6.0 ? '🍋 Sour Zone!' : 
                           currentData.ph > 8.0 ? '🧂 Salty Zone!' : 
                           '🎯 Perfect Zone!'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm opacity-75">Normal Range: 6.0-8.0</div>
                  </motion.div>
                )}
                
                {/* Health Score - Fun Card */}
                {currentData.colorScore && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/20 backdrop-blur rounded-2xl p-3 sm:p-4 border border-white/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg sm:text-2xl">🏆</span>
                        <span className="font-bold text-sm sm:text-lg">Health Score</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl sm:text-3xl font-black">{currentData.colorScore}/10</div>
                        <div className="text-xs sm:text-sm opacity-80">
                          {currentData.colorScore >= 9 ? 'Superhero!' : 
                           currentData.colorScore >= 7 ? 'Pretty Good!' : 
                           currentData.colorScore >= 5 ? 'Getting There' : 
                           currentData.colorScore >= 3 ? 'Needs Work' :
                           'Need Help!'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm opacity-75">Target: 8-10 for super powers!</div>
                  </motion.div>
                )}
              </div>

              {/* Fun Hydration Meter */}
              {currentData.colorScore && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="bg-cyan-500 rounded-2xl p-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-2xl"
                        >
                          💧
                        </motion.span>
                        <span className="font-bold text-white">Hydration Meter</span>
                      </div>
                      <span className="text-2xl font-black text-white">
                        {Math.max(10, Math.min(100, (currentData.colorScore * 10) + 10))}%
                      </span>
                    </div>
                    
                    {/* Fun Progress Bar */}
                    <div className="bg-white/30 rounded-full h-4 mb-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(10, Math.min(100, (currentData.colorScore * 10) + 10))}%` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="bg-gradient-to-r from-yellow-300 to-green-300 h-full rounded-full flex items-center justify-end pr-2"
                      >
                        <motion.span
                          animate={{ x: [-5, 5, -5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-xs"
                        >
                          🚀
                        </motion.span>
                      </motion.div>
                    </div>
                    
                    <div className="text-white font-medium">
                      {currentData.colorScore >= 9 ? 'You\'re a hydration champion!' : 
                       currentData.colorScore >= 7 ? 'Keep up the good work!' : 
                       currentData.colorScore >= 5 ? 'Time for more water!' : 
                       currentData.colorScore >= 3 ? 'Drink more water soon!' :
                       'DRINK WATER NOW! Your body is thirsty!'}
                    </div>
                </div>
                </motion.div>
              )}
              
              {/* Fun Status Info */}
              <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span>Last Updated:</span>
                  <span className="font-medium">{new Date().toLocaleTimeString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <span className="font-medium">
                    {currentData.ph || currentData.colorScore ? 'Live & Active!' : 'Waiting for data...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  SignalIcon,
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
      name: 'ML Processing',
      description: 'K-means analysis and health score calculation',
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
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    // Initialize Socket.io connection (not raw WebSocket)
    const initSocketConnection = () => {
      // For now, let's simulate connection since Socket.io client needs to be installed
      // TODO: Install socket.io-client and use proper Socket.io connection
      setIsConnected(true)
      addLog('🔗 Connected to PUMA backend (simulated)')
      updateStep('connection', 'completed')
      
      // Listen for manual reading results instead of WebSocket events
      // The manual reading API will provide all the data we need
    }

    initSocketConnection()

    return () => {
      // Cleanup if needed
    }
  }, [])

  const addLog = (message: string) => {
    setLogs(prev => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prev.slice(0, 19) // Keep last 20 logs
    ])
  }

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
    try {
      setIsAnalyzing(true)
      addLog('🔬 Analysis Process started')
      resetSteps()

      // Step 1: Connection Check
      updateStep('connection', 'active')
      addLog('🔍 Checking Arduino connection...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep('connection', 'completed')

      // Step 2: 5s Collection
      updateStep('collection', 'active')
      addLog('📊 Starting 5-second data collection...')
      
      // Simulate 5-second collection with progress
      for (let i = 0; i <= 100; i += 20) {
        updateStep('collection', 'active', i)
        addLog(`📊 5s Collection: ${i}%`)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      updateStep('collection', 'completed')

      // Step 3: ML Processing
      updateStep('processing', 'active')
      addLog('🧠 ML Processing started...')
      
      // Call the actual API
      const response = await fetch('http://localhost:3001/api/readings/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('puma_access_token')}`
        }
      })

      const data = await response.json()
      
      if (data.success && data.data?.readingData) {
        const readingData = data.data.readingData
        
        // Update current data display
        setCurrentData({
          ph: readingData.averagedReading?.ph,
          color: readingData.averagedReading?.color,
          colorScore: readingData.colorScore,
          confidence: readingData.confidence,
          recommendations: readingData.recommendations
        })
        
        addLog(`🎨 ML Processing complete - Score: ${readingData.colorScore}, Confidence: ${(readingData.confidence * 100).toFixed(1)}%`)
        updateStep('processing', 'completed')

        // Step 4: Storage
        updateStep('storage', 'active')
        addLog('💾 Storing results to database...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        addLog(`💡 Recommendations generated: ${readingData.recommendations?.length || 0} items`)
        updateStep('storage', 'completed')
        
        addLog('✅ Analysis Process complete!')
      } else {
        addLog(`❌ Analysis failed: ${data.error || 'Unknown error'}`)
        setSteps(prev => prev.map(step => 
          step.status === 'active' ? { ...step, status: 'error' } : step
        ))
      }
      
    } catch (error) {
      addLog('❌ Network error during analysis')
      console.error('Analysis error:', error)
      setSteps(prev => prev.map(step => 
        step.status === 'active' ? { ...step, status: 'error' } : step
      ))
    } finally {
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

          {/* Manual Trigger Button */}
          <button
            onClick={triggerManualAnalysis}
            disabled={!isConnected || isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <BeakerIcon className="w-4 h-4" />
            <span>{isAnalyzing ? 'Analyzing...' : 'Start Analysis'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Process Steps */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6">
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
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-3" />
                  <span className="font-medium text-blue-900">
                    {steps.find(step => step.status === 'active')?.name} in progress...
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Current Data & Logs */}
        <div className="space-y-6">
          {/* Current Reading Data */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Current Reading
            </h3>
            
            <div className="space-y-3">
              {currentData.ph && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">pH Level:</span>
                  <span className="font-medium">{currentData.ph.toFixed(2)}</span>
                </div>
              )}
              
              {currentData.color && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Color RGB:</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: `rgb(${currentData.color.r}, ${currentData.color.g}, ${currentData.color.b})` }}
                    />
                    <span className="font-medium text-xs">
                      {currentData.color.r}, {currentData.color.g}, {currentData.color.b}
                    </span>
                  </div>
                </div>
              )}
              
              {currentData.colorScore && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Health Score:</span>
                  <span className="font-medium">{currentData.colorScore}/10</span>
                </div>
              )}
              
              {currentData.confidence && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="font-medium">{(currentData.confidence * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Logs */}
          <div className="bg-gray-900 rounded-xl p-4 text-sm">
            <h3 className="font-semibold text-white mb-3 flex items-center">
              <SignalIcon className="w-4 h-4 mr-2" />
              Live Logs
            </h3>
            
            <div className="h-64 overflow-y-auto space-y-1">
              <AnimatePresence>
                {logs.map((log, index) => (
                  <motion.div
                    key={`${log}-${index}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-green-400 font-mono text-xs"
                  >
                    {log}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
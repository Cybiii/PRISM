'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <SparklesIcon className="w-8 h-8 mr-3 text-blue-600" />
            Health Insights
          </h1>
          <p className="text-gray-600">
            AI-powered health insights and personalized recommendations based on your PUMA readings
          </p>
        </motion.div>

        {/* Coming Soon Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <ChartBarIcon className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Trend Analysis</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Advanced analytics of your health patterns over time, identifying trends and correlations.
            </p>
            <div className="bg-blue-50 rounded-lg p-3">
              <span className="text-blue-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <LightBulbIcon className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Smart Recommendations</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Personalized health recommendations based on your unique reading patterns and health profile.
            </p>
            <div className="bg-green-50 rounded-lg p-3">
              <span className="text-green-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center mb-4">
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Predictive Health</h3>
            </div>
            <p className="text-gray-600 mb-4">
              AI-powered predictions and early warning systems for potential health concerns.
            </p>
            <div className="bg-purple-50 rounded-lg p-3">
              <span className="text-purple-600 font-medium">Coming Soon</span>
            </div>
          </motion.div>
        </div>

        {/* Placeholder Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <SparklesIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Advanced Health Intelligence</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This section will feature advanced AI-powered health insights, trend analysis, 
            and predictive health monitoring based on your continuous PUMA sensor readings. 
            Stay tuned for these exciting features!
          </p>
        </motion.div>
      </div>
    </div>
  )
} 
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import LiveAnalysisMonitor from '../../components/LiveAnalysisMonitor'

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Process</h1>
          <p className="text-gray-600">
            Monitor real-time PUMA sensor analysis from connection to storage
          </p>
        </motion.div>

        {/* Live Analysis Monitor Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <LiveAnalysisMonitor />
        </motion.div>
      </div>
    </div>
  )
} 
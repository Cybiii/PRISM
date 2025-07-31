'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChartBarIcon, 
  CalendarDaysIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface ChartProps {
  width?: number
  height?: number
}

interface HealthData {
  date: string
  ph: number
  hydration: number
  colorScore: number
}

const WeeklyCharts: React.FC<ChartProps> = ({ width = 300, height = 150 }) => {
  const [data, setData] = useState<HealthData[]>([])
  const [loading, setLoading] = useState(true)

  // No mock data - show empty state when no real data
  useEffect(() => {
    setTimeout(() => {
      setData([]) // Empty data array - will show "no data" states
      setLoading(false)
    }, 500)
  }, [])

  const renderPHChart = () => {
    if (!data.length) return null
    
    const maxPH = Math.max(...data.map(d => d.ph))
    const minPH = Math.min(...data.map(d => d.ph))
    const range = maxPH - minPH || 1
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 40) + 20
      const y = height - 40 - ((d.ph - minPH) / range) * (height - 60)
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">pH Levels</h3>
        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
          <svg width={width} height={height}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e5e5" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* pH line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={points}
            />
            
            {/* Data points */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * (width - 40) + 20
              const y = height - 40 - ((d.ph - minPH) / range) * (height - 60)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#3b82f6"
                />
              )
            })}
            
            {/* X-axis labels */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * (width - 40) + 20
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {d.date}
                </text>
              )
            })}
            
            {/* Y-axis labels */}
            <text x="10" y={height - 40} fontSize="10" fill="#666">
              {minPH.toFixed(1)}
            </text>
            <text x="10" y="25" fontSize="10" fill="#666">
              {maxPH.toFixed(1)}
            </text>
          </svg>
        </div>
      </div>
    )
  }

  const renderHydrationChart = () => {
    if (!data.length) return null
    
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Hydration Levels</h3>
        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
          <svg width={width} height={height}>
            {/* Background */}
            <rect width="100%" height="100%" fill="#f8f9fa" rx="4" />
            
            {/* Bars */}
            {data.map((d, i) => {
              const barWidth = (width - 60) / data.length * 0.8
              const barHeight = (d.hydration / 100) * (height - 60)
              const x = (i / data.length) * (width - 60) + 30 + (barWidth * 0.1)
              const y = height - 40 - barHeight
              
              // Color based on hydration level
              const color = d.hydration > 70 ? '#10b981' : 
                           d.hydration > 40 ? '#f59e0b' : '#ef4444'
              
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    rx="2"
                  />
                  <text
                    x={x + barWidth/2}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                  >
                    {d.date}
                  </text>
                </g>
              )
            })}
            
            {/* Y-axis */}
            <text x="10" y={height - 40} fontSize="10" fill="#666">0%</text>
            <text x="10" y="25" fontSize="10" fill="#666">100%</text>
          </svg>
        </div>
      </div>
    )
  }

  const renderColorScoreChart = () => {
    if (!data.length) return null
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 40) + 20
      const y = height - 40 - ((d.colorScore - 1) / 4) * (height - 60)
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Color Score Trend</h3>
        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
          <svg width={width} height={height}>
            {/* Grid */}
            <defs>
              <pattern id="colorGrid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e5e5" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#colorGrid)" />
            
            {/* Color score line */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              points={points}
            />
            
            {/* Data points */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * (width - 40) + 20
              const y = height - 40 - ((d.colorScore - 1) / 4) * (height - 60)
              const color = d.colorScore <= 2 ? '#10b981' : 
                           d.colorScore <= 3 ? '#f59e0b' : '#ef4444'
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                />
              )
            })}
            
            {/* X-axis labels */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * (width - 40) + 20
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {d.date}
                </text>
              )
            })}
            
            {/* Y-axis labels */}
            <text x="10" y={height - 40} fontSize="10" fill="#666">1</text>
            <text x="10" y="25" fontSize="10" fill="#666">5</text>
          </svg>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: height * 3 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: width + 40 }}>
      {renderPHChart()}
      {renderHydrationChart()}
      {renderColorScoreChart()}
      
      {/* Summary stats */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Weekly Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {data.length > 0 ? (data.reduce((sum, d) => sum + d.ph, 0) / data.length).toFixed(1) : '0.0'}
            </div>
            <div className="text-xs text-gray-500">Avg pH</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">
              {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.hydration, 0) / data.length) : 0}%
            </div>
            <div className="text-xs text-gray-500">Avg Hydration</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-600">
              {data.length > 0 ? (data.reduce((sum, d) => sum + d.colorScore, 0) / data.length).toFixed(1) : '0.0'}
            </div>
            <div className="text-xs text-gray-500">Avg Color Score</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyCharts 
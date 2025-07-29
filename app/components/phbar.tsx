'use client'

import React, { useMemo } from 'react'
import readings from '@/app/data/mock-readings.json'

interface Reading {
  timestamp: string
  hydration_ml: number
  ph: number
}

type PhBarProps = {
  width: number     
  height?: number   
}

export default function PhBar({ width, height = 24 }: PhBarProps) {
  const minPh = 4.5
  const maxPh = 7.5
  const rangeTotal = maxPh - minPh

  const buckets = [
    { range: [4.5, 5],   color: '#ea8686ff' },
    { range: [5, 5.5], color: '#f8e273ff' },  
    { range: [5.5, 6.5],   color: '#81c784' },
    { range: [6.5, 7],   color: '#f8e273ff' },
    { range: [7, 7.5],   color: '#ea8686ff' },
  ]

  const latestPh = useMemo(() => {
    const data = readings as Reading[]
    if (!data.length) return minPh
    return data
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      .ph
  }, [])

  const gradientStops = buckets.map(({ range, color }) => ({
    start: ((range[0] - minPh) / rangeTotal) * 100,
    end:   ((range[1] - minPh) / rangeTotal) * 100,
    color,
  }))

  const gradient = `linear-gradient(
    to right,
    ${gradientStops.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')}
  )`


  const markerPercent = Math.max(0, Math.min(((latestPh - minPh) / rangeTotal) * 100, 100))

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        margin: '0 auto',           // center horizontally
        borderRadius: height / 2,  // full pill rounding
        background: gradient,
        overflow: 'hidden',
      }}
    >
      {/* vertical marker */}
      <div
        style={{
          position: 'absolute',
          left: `${markerPercent}%`,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#333',
        }}
      />
    </div>
  )
}

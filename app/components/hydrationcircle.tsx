'use client'

import React, { useMemo } from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import readings from '@/app/data/mock-readings.json'

interface Reading {
  timestamp: string
  hydration_ml: number
  ph: number
}

export default function HydrationCircle({
  size = 150,
  optimalMl = 700,
}: {
  size?: number
  optimalMl?: number
}) {
  // grab the latest hydration value
  const latest = useMemo(() => {
    const arr = readings as Reading[]
    if (!arr.length) return 0
    return arr
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0].hydration_ml
  }, [])

  const pct = Math.min(latest / optimalMl, 1) * 100

  return (
    <div style={{ width: size, height: size, margin: '0 auto'}}>
      <CircularProgressbar
        value={pct}
        text={`${latest} mL`}
        strokeWidth={10}
        styles={buildStyles({
          pathColor: 'lightseagreen', 
          trailColor: '#E5E5EA',
          textColor: '#1C1C1E', 
          textSize: '16px',
        })}
      />
    </div>
  )
}

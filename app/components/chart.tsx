'use client'

import React from 'react'
import { Group } from '@visx/group'
import { Bar } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { scaleBand, scaleLinear } from '@visx/scale'
import readings from '@/app/data/mock-readings.json'

interface Reading {
  timestamp: string
  hydration_ml: number
  ph: number
}

type WeeklyChartsProps = {
  width: number
  height: number
}

export default function WeeklyCharts({ width, height }: WeeklyChartsProps) {
  const margin = { top: 20, right: 20, bottom: 40, left: 50 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  // aggregate hydration sums and ph averages per day
  const hydrationTotals: Record<string, number> = {}
  const phAggregates: Record<string, { sum: number; count: number }> = {}

  ;(readings as Reading[]).forEach(({ timestamp, hydration_ml, ph }) => {
    const dateObj = new Date(timestamp)
    const dayLabel = dayNames[dateObj.getUTCDay()]
    hydrationTotals[dayLabel] = (hydrationTotals[dayLabel] || 0) + hydration_ml
    if (!phAggregates[dayLabel]) phAggregates[dayLabel] = { sum: 0, count: 0 }
    phAggregates[dayLabel].sum += ph
    phAggregates[dayLabel].count += 1
  })

  const hydrationData = dayNames.map(day => ({ day, value: hydrationTotals[day] || 0 }))
  const phData = dayNames.map(day => ({
    day,
    value: phAggregates[day]?.sum / phAggregates[day]?.count || 0,
  }))

  const xScale = scaleBand<string>({ domain: dayNames, range: [0, innerWidth], padding: 0.2 })
  const maxHydration = Math.max(...hydrationData.map(d => d.value))
  const yHydrationScale = scaleLinear<number>({ domain: [0, maxHydration], range: [innerHeight, 0], nice: true })
  const yPhScale = scaleLinear<number>({ domain: [4.5, 8.0], range: [innerHeight, 0], nice: true })

  // determine latest reading timestamp
  const latestReading = (readings as Reading[])
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  const latestDate = new Date(latestReading.timestamp)
  const formattedDate = latestDate.toLocaleString('en-US', {
    month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
  })

  return (
    <>
      <div
        style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 8,
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 12, color: '#444', letterSpacing: 1 }}>
          HYDRATION
        </h2>
        <svg width={width} height={height}>
          <Group left={margin.left} top={margin.top}>
            {hydrationData.map((d, i) => {
              const x = xScale(d.day) || 0
              const y = yHydrationScale(d.value)
              const barHeight = innerHeight - y
              return (
                <Bar
                  key={`hydration-bar-${i}`}
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={barHeight}
                  fill="lightseagreen"
                />
              )
            })}
            <AxisLeft scale={yHydrationScale} numTicks={4} stroke="lightgrey" tickStroke="lightgrey" tickLabelProps={() => ({ fontSize: 10, textAnchor: 'end', dx: '-0.3em', fill: 'lightgrey' })} />
            <AxisBottom top={innerHeight} scale={xScale} stroke="lightgrey" tickStroke="lightgrey" tickLabelProps={() => ({ fontSize: 12, textAnchor: 'middle', fill: 'lightgrey' })} />
          </Group>
        </svg>

        <div style={{ marginTop: 20 }} />

        <h2 style={{ textAlign: 'center', marginBottom: 12, color: '#444', letterSpacing: 1 }}>
          PH LEVEL
        </h2>
        <svg width={width} height={height}>
          <Group left={margin.left} top={margin.top}>
            {phData.map((d, i) => {
              const x = xScale(d.day) || 0
              const y = yPhScale(d.value)
              const barHeight = innerHeight - y
              return (
                <Bar
                  key={`ph-bar-${i}`}
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={barHeight}
                  fill="plum"
                />
              )
            })}
            <AxisLeft scale={yPhScale} numTicks={2} stroke="lightgrey" tickStroke="lightgrey" tickLabelProps={() => ({ fontSize: 11, textAnchor: 'end', dx: '-0.3em', fill: 'lightgrey' })} />
            <AxisBottom top={innerHeight} scale={xScale} stroke="lightgrey" tickStroke="lightgrey" tickLabelProps={() => ({ fontSize: 12, textAnchor: 'middle', fill: 'lightgrey' })} />
          </Group>
        </svg>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid lightgrey',
              borderRadius: 16,
              padding: '4px 16px',
              color: 'grey',
              fontSize: 12,
            }}
          >
            <span style={{ marginRight: 50 }}>latest reading:</span>
            <span style={{ marginLeft: 'auto' }}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      <div
        style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 12, color: '#444', fontSize: 16 }}>
          Trends
        </h2>
        <p style={{ textAlign: 'center', marginBottom: 20, color: '#888', fontSize: 14 }}>
          Your hydration and pH levels have been steady over the past 3 weeks.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: '600', color: 'lightseagreen' }}>+5%</div>
            <div style={{ fontSize: 12, color: '#999' }}>Hydration Change</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: '600', color: 'plum' }}>+0.2</div>
            <div style={{ fontSize: 12, color: '#999' }}>pH Change</div>
          </div>
        </div>
      </div>
    </>
  )
}

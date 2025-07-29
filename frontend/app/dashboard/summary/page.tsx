'use client'

import React from 'react'
import WeeklyCharts from '@/app/components/chart'

export default function Page() {
  return (
    <div
      style={{
        backgroundColor: '#f0f0f0',
        minHeight: '150vh',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          backgroundColor: '#e0e0e0',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
          width: '100%',
          maxWidth: 400,
        }}
      >
        {['day', 'week', 'month'].map((label, idx) => (
          <button
            key={label}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: idx === 1 ? '#ffffff' : 'transparent',
              padding: '0px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              color: '#141414',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <WeeklyCharts width={300} height={150} />
    </div>
  )
}

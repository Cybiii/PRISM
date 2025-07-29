'use client'

import React, { useMemo } from 'react'
import HydrationCircle from '@/app/components/hydrationcircle'
import PhBar from '@/app/components/phbar'

export default function Page() {
  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [])

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
          width: '100%',
          maxWidth: 400,
          padding: '12px 8px 0',
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 600, color: '#000' }}>
          Hello, Anchita.
        </div>
        <div style={{ fontSize: 14, color: '#666', marginTop: 0 }}>
          It's {todayStr}. Your hydration levels are steady.
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          padding: 20,
          borderRadius: 8,
          maxWidth: 400,
          width: '100%',
          margin: '24px auto 0',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            marginBottom: 16,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: 12,
          }}
        >
          Hydration
        </h2>
        <div style={{ textAlign: 'center' }}>
          <HydrationCircle size={150} optimalMl={700} />
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          padding: 20,
          borderRadius: 8,
          maxWidth: 400,
          width: '100%',
          margin: '16px auto 0',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            marginBottom: 16,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: 12,
          }}
        >
          pH Level
        </h2>
        <div style={{ textAlign: 'center' }}>
          <PhBar width={250} height={36} />
        </div>
      </div>
    </div>
  
  )
}

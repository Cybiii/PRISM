'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function AuthDebugger() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [apiTest, setApiTest] = useState<string>('')

  useEffect(() => {
    const checkAuthStatus = () => {
      const accessToken = localStorage.getItem('puma_access_token')  
      const refreshToken = localStorage.getItem('puma_refresh_token')
      const userData = localStorage.getItem('puma_user_data')

      setAuthInfo({
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUserData: !!userData,
        accessTokenLength: accessToken?.length || 0,
        userData: userData ? JSON.parse(userData) : null,
        accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'None'
      })
    }

    checkAuthStatus()
  }, [])

  const testApiCall = async () => {
    setApiTest('Testing...')
    try {
      const token = localStorage.getItem('puma_access_token')
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      setApiTest(`Status: ${response.status}, Success: ${data.success}, Error: ${data.error || 'None'}`)
    } catch (error) {
      setApiTest(`Network Error: ${error}`)
    }
  }

  const clearTokens = () => {
    localStorage.removeItem('puma_access_token')
    localStorage.removeItem('puma_refresh_token')  
    localStorage.removeItem('puma_user_data')
    window.location.href = '/login'
  }

  if (!authInfo) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs z-50"
    >
      <h3 className="font-bold mb-2 text-yellow-400">🔍 Auth Debug Info</h3>
      
      <div className="space-y-1">
        <div>Access Token: {authInfo.hasAccessToken ? '✅' : '❌'} ({authInfo.accessTokenLength} chars)</div>
        <div>Refresh Token: {authInfo.hasRefreshToken ? '✅' : '❌'}</div>
        <div>User Data: {authInfo.hasUserData ? '✅' : '❌'}</div>
        {authInfo.userData && (
          <div>User Email: {authInfo.userData.user?.email || 'Unknown'}</div>
        )}
        <div className="text-gray-300">Token: {authInfo.accessTokenPreview}</div>
      </div>

      <div className="mt-3 space-y-2">
        <button 
          onClick={testApiCall}
          className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Test API Call
        </button>
        
        <button 
          onClick={clearTokens}
          className="w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Clear Tokens & Re-login
        </button>
      </div>

      {apiTest && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
          <strong>API Test:</strong> {apiTest}
        </div>
      )}
    </motion.div>
  )
} 
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserData, isAuthenticated, verifyToken, clearAuthData, UserData } from '../lib/auth'

interface AuthContextType {
  user: UserData | null
  loading: boolean
  login: (userData: UserData) => void
  logout: () => void
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isLoggedIn = !!user

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isAuthenticated()) {
          // Verify the token is still valid
          const isValid = await verifyToken()
          if (isValid) {
            const userData = getUserData()
            setUser(userData)
          } else {
            // Token invalid, clear data
            clearAuthData()
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        clearAuthData()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = (userData: UserData) => {
    setUser(userData)
  }

  const logout = () => {
    clearAuthData()
    setUser(null)
    router.push('/login')
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isLoggedIn
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 
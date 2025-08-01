// Authentication utilities for PRISM frontend

export interface UserData {
  user: {
    id: string
    email: string
    emailConfirmed: boolean
  }
  profile: {
    id: string
    full_name?: string
    age?: number
    gender?: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Storage keys
const ACCESS_TOKEN_KEY = 'puma_access_token'
const REFRESH_TOKEN_KEY = 'puma_refresh_token'
const USER_DATA_KEY = 'puma_user_data'

// API base URL - dynamically set based on environment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // Vercel will route /api/* to our serverless functions
  : 'http://localhost:3001/api'

/**
 * Get the API base URL for the current environment
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  console.log('🔍 getAccessToken:', { 
    hasToken: !!token, 
    length: token?.length || 0, 
    preview: token ? `${token.substring(0, 20)}...` : 'null' 
  })
  return token
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(REFRESH_TOKEN_KEY)
  console.log('🔍 getRefreshToken:', { 
    hasToken: !!token, 
    length: token?.length || 0, 
    preview: token ? `${token.substring(0, 20)}...` : 'null' 
  })
  return token
}

/**
 * Get stored user data
 */
export function getUserData(): UserData | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(USER_DATA_KEY)
  return data ? JSON.parse(data) : null
}

/**
 * Store authentication data
 */
export function storeAuthData(tokens: AuthTokens, userData: UserData): void {
  if (typeof window === 'undefined') return
  
  console.log('🔍 storeAuthData:', {
    accessToken: { 
      exists: !!tokens.accessToken, 
      length: tokens.accessToken?.length || 0,
      preview: tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'undefined'
    },
    refreshToken: { 
      exists: !!tokens.refreshToken, 
      length: tokens.refreshToken?.length || 0,
      preview: tokens.refreshToken ? `${tokens.refreshToken.substring(0, 20)}...` : 'undefined'
    },
    userData: !!userData
  })
  
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
}

/**
 * Clear all stored authentication data
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_DATA_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  // If token is expired, try to refresh
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      // Retry the request with new token
      const newToken = getAccessToken()
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`
        }
      })
    }
  }

  return response
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    clearAuthData()
    return false
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    })

    const data = await response.json()

    if (data.success && data.data) {
      storeAuthData(
        {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken
        },
        {
          user: data.data.user,
          profile: data.data.profile
        }
      )
      return true
    } else {
      clearAuthData()
      return false
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
    clearAuthData()
    return false
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint
    await authenticatedFetch('/auth/signout', {
      method: 'POST'
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    // Always clear local data
    clearAuthData()
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}

/**
 * Verify current token is valid
 */
export async function verifyToken(): Promise<boolean> {
  if (!isAuthenticated()) return false

  try {
    const response = await authenticatedFetch('/auth/me')
    const data = await response.json()
    
    if (data.success) {
      // Update stored user data
      const currentTokens = {
        accessToken: getAccessToken()!,
        refreshToken: getRefreshToken()!
      }
      storeAuthData(currentTokens, {
        user: data.data.user,
        profile: data.data.profile
      })
      return true
    } else {
      clearAuthData()
      return false
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    clearAuthData()
    return false
  }
} 
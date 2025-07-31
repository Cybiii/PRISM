'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  CalendarIcon,
  UserIcon,
  HeartIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { authenticatedFetch } from '../../lib/auth'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  medical_conditions?: string[]
  medications?: string[]
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  emailConfirmed: boolean
}

export default function ProfilePage() {
  console.log('🚀 ProfilePage component initialized')
  
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('connected')
  const [navUserProfile, setNavUserProfile] = useState<{ full_name?: string } | null>(null)
  const [newCondition, setNewCondition] = useState('')
  const [newMedication, setNewMedication] = useState('')

  console.log('📊 ProfilePage state initialized:', { 
    profileExists: !!profile, 
    userExists: !!user, 
    loading, 
    editing, 
    saving,
    hasError: !!error,
    hasSuccess: !!success
  })

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    medical_conditions: [] as string[],
    medications: [] as string[]
  })

  console.log('📝 FormData state:', formData)

  useEffect(() => {
    console.log('🔄 ProfilePage useEffect triggered')
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      console.log('🔍 fetchProfile started')
      setLoading(true)
      
      // Check if user is authenticated first
      let token = localStorage.getItem('puma_access_token')
      console.log('🔑 Access token check:', { 
        hasToken: !!token, 
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
      })
      
      // Development mode: Create mock authentication if no token exists
      if (!token && (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
        console.log('🔧 Development mode: Setting up mock authentication')
        const mockToken = 'dev-mock-token-' + Date.now()
        const mockUserData = {
          user: {
            id: 'demo-user-123',
            email: 'demo@puma-health.com',
            emailConfirmed: true
          },
          profile: {
            id: 'demo-profile-123',
            full_name: 'Demo User',
            age: 25,
            gender: 'prefer_not_to_say'
          }
        }
        
        localStorage.setItem('puma_access_token', mockToken)
        localStorage.setItem('puma_refresh_token', 'dev-mock-refresh-token')
        localStorage.setItem('puma_user_data', JSON.stringify(mockUserData))
        token = mockToken
        
        console.log('✅ Mock authentication set up successfully')
      }
      
      if (!token) {
        console.log('❌ No access token found, redirecting to login')
        router.push('/login')
        return
      }

      console.log('🌐 Making API call to /auth/me')
      const response = await authenticatedFetch('/auth/me')
      
      console.log('📡 API Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      // Handle 401 specifically - redirect to login
      if (response.status === 401) {
        console.log('🚫 Authentication failed (401), clearing tokens and redirecting to login')
        localStorage.removeItem('puma_access_token')
        localStorage.removeItem('puma_refresh_token')
        localStorage.removeItem('puma_user_data')
        router.push('/login')
        return
      }

      console.log('📜 Parsing response JSON...')
      const data = await response.json()
      console.log('🎯 Parsed response data:', {
        success: data.success,
        hasData: !!data.data,
        hasUser: !!data.data?.user,
        hasProfile: !!data.data?.profile,
        error: data.error
      })

      if (data.success) {
        console.log('✅ API call successful, setting state')
        console.log('👤 User data:', data.data.user)
        console.log('📋 Profile data:', data.data.profile)
        
        setUser(data.data.user)
        setProfile(data.data.profile)
        
        // Initialize form data
        if (data.data.profile) {
          console.log('📝 Initializing form data with profile')
          const newFormData = {
            full_name: data.data.profile.full_name || '',
            age: data.data.profile.age?.toString() || '',
            gender: data.data.profile.gender || '',
            medical_conditions: data.data.profile.medical_conditions || [],
            medications: data.data.profile.medications || []
          }
          console.log('📝 New form data:', newFormData)
          setFormData(newFormData)
        } else {
          console.log('⚠️ No profile data in response, using empty form')
        }
      } else {
        console.log('❌ API call failed:', data.error)
        setError('Failed to load profile data: ' + (data.error || 'Unknown error'))
      }
    } catch (err: any) {
      console.error('💥 Profile fetch error:', err)
      console.error('💥 Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      })
      setError('Unable to load profile. Please check your connection and try again.')
    } finally {
      console.log('🏁 fetchProfile finished, setting loading = false')
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Load user profile for navbar
  useEffect(() => {
    const loadNavUserProfile = async () => {
      try {
        const userData = localStorage.getItem('puma_user_data')
        if (userData) {
          const parsed = JSON.parse(userData)
          setNavUserProfile({
            full_name: parsed.profile?.full_name
          })
        }
      } catch (error) {
        console.error('Error loading nav user profile:', error)
      }
    }
    loadNavUserProfile()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('puma_access_token')
    localStorage.removeItem('puma_refresh_token')
    localStorage.removeItem('puma_user_data')
    router.push('/login')
  }

  const addCondition = () => {
    console.log('➕ Adding medical condition:', newCondition)
    if (newCondition.trim() && !formData.medical_conditions.includes(newCondition.trim())) {
      const updatedConditions = [...formData.medical_conditions, newCondition.trim()]
      console.log('📝 Updated medical conditions:', updatedConditions)
      setFormData(prev => ({
        ...prev,
        medical_conditions: updatedConditions
      }))
      setNewCondition('')
    } else {
      console.log('⚠️ Condition not added - empty or duplicate:', newCondition)
    }
  }

  const removeCondition = (condition: string) => {
    console.log('➖ Removing medical condition:', condition)
    const updatedConditions = formData.medical_conditions.filter(c => c !== condition)
    console.log('📝 Updated medical conditions after removal:', updatedConditions)
    setFormData(prev => ({
      ...prev,
      medical_conditions: updatedConditions
    }))
  }

  const addMedication = () => {
    console.log('➕ Adding medication:', newMedication)
    if (newMedication.trim() && !formData.medications.includes(newMedication.trim())) {
      const updatedMedications = [...formData.medications, newMedication.trim()]
      console.log('📝 Updated medications:', updatedMedications)
      setFormData(prev => ({
        ...prev,
        medications: updatedMedications
      }))
      setNewMedication('')
    } else {
      console.log('⚠️ Medication not added - empty or duplicate:', newMedication)
    }
  }

  const removeMedication = (medication: string) => {
    console.log('➖ Removing medication:', medication)
    const updatedMedications = formData.medications.filter(m => m !== medication)
    console.log('📝 Updated medications after removal:', updatedMedications)
    setFormData(prev => ({
      ...prev,
      medications: updatedMedications
    }))
  }

  const handleSave = async () => {
    try {
      console.log('💾 handleSave started')
      setSaving(true)
      setError('')
      
      const updateData = {
        full_name: formData.full_name || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        medical_conditions: formData.medical_conditions,
        medications: formData.medications
      }

      console.log('📤 Preparing to send update data:', updateData)

      const response = await authenticatedFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      console.log('📡 Profile update response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      const data = await response.json()
      console.log('🎯 Profile update parsed response:', data)

      if (data.success) {
        console.log('✅ Profile update successful')
        setProfile(data.data)
        setSuccess('Profile updated successfully!')
        setEditing(false)
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          console.log('🧹 Clearing success message')
          setSuccess('')
        }, 3000)
      } else {
        console.log('❌ Profile update failed:', data.error)
        setError(data.error || 'Failed to update profile')
      }
    } catch (err: any) {
      console.error('💥 Profile save error:', err)
      console.error('💥 Save error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      })
      setError('Unable to save profile. Please try again.')
    } finally {
      console.log('🏁 handleSave finished, setting saving = false')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        medical_conditions: profile.medical_conditions || [],
        medications: profile.medications || []
      })
    }
    setEditing(false)
    setError('')
  }

  if (loading) {
    console.log('🔄 ProfilePage rendering loading state')
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
            />
          </div>
        </div>
      </div>
    )
  }

  console.log('🎨 ProfilePage rendering main component', {
    hasProfile: !!profile,
    hasUser: !!user,
    editing,
    saving,
    errorMessage: error,
    successMessage: success
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="hidden md:block bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1.5 rounded-full border border-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">
                  {backendStatus === 'connected' ? 'System Online' : 'System Offline'}
                </span>
              </div>

              {/* User Profile Button */}
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                  {navUserProfile?.full_name || profile?.full_name || 'User'}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your personal information and health data</p>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">{success}</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header Section */}
          <div className="bg-blue-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {profile?.full_name || 'PUMA User'}
                  </h2>
                  <p className="text-blue-100 flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    {user?.email}
                  </p>
                  {user?.emailConfirmed && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500 text-white mt-1">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => editing ? handleCancel() : setEditing(true)}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                {editing ? (
                  <>
                    <XMarkIcon className="w-4 h-4" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <PencilIcon className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">
                      {profile?.full_name || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  {editing ? (
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your age"
                    />
                  ) : (
                    <p className="text-gray-900 py-2 flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                      {profile?.age ? `${profile.age} years old` : 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  {editing ? (
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 py-2 capitalize">
                      {profile?.gender || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Health Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <HeartIcon className="w-5 h-5 mr-2 text-red-500" />
                  Health Information
                </h3>

                {/* Medical Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Conditions
                  </label>
                  
                  {editing ? (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCondition}
                          onChange={(e) => setNewCondition(e.target.value)}
                          placeholder="Add medical condition"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                        />
                        <button
                          type="button"
                          onClick={addCondition}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {formData.medical_conditions.map((condition, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                          >
                            {condition}
                            <button
                              type="button"
                              onClick={() => removeCondition(condition)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      {profile?.medical_conditions && profile.medical_conditions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.medical_conditions.map((condition, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">None listed</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  
                  {editing ? (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMedication}
                          onChange={(e) => setNewMedication(e.target.value)}
                          placeholder="Add medication"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                        />
                        <button
                          type="button"
                          onClick={addMedication}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {formData.medications.map((medication, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {medication}
                            <button
                              type="button"
                              onClick={() => removeMedication(medication)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      {profile?.medications && profile.medications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.medications.map((medication, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                            >
                              {medication}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">None listed</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Account Created:</span>
                  <p>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <p>{profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {editing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3"
              >
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  )
}
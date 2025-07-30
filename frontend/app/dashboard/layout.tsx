'use client'

import React from 'react'
import { motion } from 'framer-motion'
import NavLinks from '@/app/ui/dashboard/nav-links'
import BottomNav from '@/app/ui/dashboard/bottomnav'
import { 
  BeakerIcon,
  Bars3Icon,
  BellIcon
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarVariants = {
    hidden: { x: -300, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Desktop Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="hidden md:flex md:w-64 md:flex-col"
      >
        <div className="flex flex-col flex-grow pt-5 bg-white/80 backdrop-blur-lg border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 pb-6">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3"
            >
              <BeakerIcon className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PUMA Health
              </h1>
              <p className="text-sm text-gray-500">Smart Monitoring</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto px-4">
            <nav className="flex-1 space-y-1">
              <NavLinks />
            </nav>
          </div>

          {/* User info at bottom */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex-shrink-0 p-4 border-t border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Demo User
                </p>
                <p className="text-xs text-gray-500 truncate">
                  demo@puma-health.com
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <BeakerIcon className="w-5 h-5 text-white" />
            </motion.div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PUMA Health
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <BellIcon className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <Bars3Icon className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.main
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 relative overflow-y-auto focus:outline-none pt-16 md:pt-0 pb-20 md:pb-0"
        >
          <div className="relative min-h-full">
            {children}
          </div>
        </motion.main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full blur-3xl opacity-5" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-r from-indigo-200 to-cyan-200 rounded-full blur-3xl opacity-5" />
      </div>
    </div>
  )
}
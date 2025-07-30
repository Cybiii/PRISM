'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  ChartBarIcon, 
  UserIcon,
  BeakerIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  BeakerIcon as BeakerIconSolid,
  SparklesIcon as SparklesIconSolid
} from '@heroicons/react/24/solid'

const navItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
    color: 'text-blue-500',
    activeColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    name: 'Analytics',
    href: '/dashboard/summary', 
    icon: ChartBarIcon,
    activeIcon: ChartBarIconSolid,
    color: 'text-purple-500',
    activeColor: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    name: 'Scan',
    href: '/dashboard/scan',
    icon: BeakerIcon,
    activeIcon: BeakerIconSolid,
    color: 'text-emerald-500',
    activeColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    isCenter: true
  },
  {
    name: 'Insights',
    href: '/dashboard/insights',
    icon: SparklesIcon,
    activeIcon: SparklesIconSolid,
    color: 'text-orange-500',
    activeColor: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: UserIcon,
    activeIcon: UserIconSolid,
    color: 'text-gray-500',
    activeColor: 'text-gray-600',
    bgColor: 'bg-gray-50'
  }
]

export default function BottomNav() {
  const pathname = usePathname()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Background blur */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-lg border-t border-gray-200" />
      
      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = isActive ? item.activeIcon : item.icon

          return (
            <div
              key={item.name}
              className="relative"
            >
              <Link href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200
                    ${item.isCenter ? 'mx-2' : ''}
                  `}
                >
                  {/* Center button special styling */}
                  {item.isCenter ? (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`
                        w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                        flex items-center justify-center shadow-lg
                        ${isActive ? 'shadow-emerald-500/30' : ''}
                      `}
                    >
                      <Icon className="w-7 h-7 text-white" />
                      
                      {/* Floating particles for center button */}
                      <AnimatePresence>
                        {isActive && (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{
                                  left: `${30 + Math.random() * 40}%`,
                                  top: `${30 + Math.random() * 40}%`,
                                }}
                                animate={{
                                  y: [-5, -15, -5],
                                  opacity: [0, 1, 0],
                                  scale: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: i * 0.2,
                                }}
                              />
                            ))}
                          </>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      {/* Regular nav item */}
                      <motion.div
                        className={`
                          w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                          ${isActive ? `${item.bgColor} ${item.activeColor}` : item.color}
                        `}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>

                      {/* Active indicator */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Label */}
                  {!item.isCenter && (
                    <motion.span
                      className={`
                        text-xs font-medium mt-1 transition-colors duration-200
                        ${isActive ? item.activeColor : 'text-gray-500'}
                      `}
                      animate={{
                        scale: isActive ? 1.05 : 1
                      }}
                    >
                      {item.name}
                    </motion.span>
                  )}

                  {/* Ripple effect on tap */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 1.5, opacity: 0.1 }}
                    style={{
                      backgroundColor: isActive ? item.activeColor : item.color
                    }}
                  />
                </motion.div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Active item background glow */}
      <AnimatePresence>
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          if (!isActive || item.isCenter) return null

          return (
            <motion.div
              key={`glow-${item.name}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`
                absolute w-20 h-20 rounded-full blur-xl
                ${item.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-50', '-300 to-' + item.color.split('-')[1] + '-400')}
              `}
              style={{
                left: `${(index / (navItems.length - 1)) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: -1
              }}
            />
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}


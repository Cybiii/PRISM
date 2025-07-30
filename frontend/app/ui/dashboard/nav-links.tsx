'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  PresentationChartLineIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  PresentationChartLineIcon as PresentationChartLineIconSolid,
  BeakerIcon as BeakerIconSolid
} from '@heroicons/react/24/solid'
import { AnimatePresence } from 'framer-motion'

const links = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon, 
    activeIcon: HomeIconSolid,
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Analytics', 
    href: '/dashboard/summary', 
    icon: ChartBarIcon, 
    activeIcon: ChartBarIconSolid,
    gradient: 'from-purple-500 to-purple-600'
  },
  { 
    name: 'Profile', 
    href: '/dashboard/profile', 
    icon: UserIcon, 
    activeIcon: UserIconSolid,
    gradient: 'from-green-500 to-green-600'
  },
  { 
    name: 'Readings', 
    href: '/dashboard/readings', 
    icon: BeakerIcon, 
    activeIcon: BeakerIconSolid,
    gradient: 'from-orange-500 to-orange-600'
  },
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Cog6ToothIcon, 
    activeIcon: Cog6ToothIconSolid,
    gradient: 'from-gray-500 to-gray-600'
  },
]

export default function NavLinks() {
  const pathname = usePathname()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { x: -10, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.2 }
    }
  }

  return (
    <motion.nav
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {links.map((link) => {
        const LinkIcon = link.icon
        const LinkIconSolid = link.activeIcon
        const isActive = pathname === link.href

        return (
          <motion.div key={link.name} variants={itemVariants}>
            <Link href={link.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? `bg-gradient-to-r ${link.gradient} text-white shadow-lg`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className="relative mr-3">
                  {isActive ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LinkIconSolid className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <LinkIcon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                  )}
                  
                  {/* Active indicator dot */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <span className="truncate">{link.name}</span>
                
                {/* Hover effect */}
                {!isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"
                    layoutId="hoverBackground"
                  />
                )}
              </motion.div>
            </Link>
          </motion.div>
        )
      })}
    </motion.nav>
  )
}

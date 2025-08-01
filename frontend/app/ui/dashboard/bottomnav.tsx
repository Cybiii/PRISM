'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Animation imports removed for performance
import {
  HomeIcon,
  DocumentDuplicateIcon,
  BeakerIcon,
  ChartBarIcon,
  UserIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

// Navigation items
const navItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
    color: 'text-slate-600 hover:text-blue-600',
    activeColor: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    name: 'Readings',
    href: '/dashboard/readings',
    icon: DocumentDuplicateIcon,
    color: 'text-slate-600 hover:text-blue-700',
    activeColor: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  {
    name: 'Scan',
    href: '/dashboard/scan',
    icon: PlusIcon,
    color: 'text-slate-600 hover:text-blue-500',
    activeColor: 'text-blue-500',
    bgColor: 'bg-blue-100',
    isCenter: true
  },
  {
    name: 'Summary',
    href: '/dashboard/summary',
    icon: EyeIcon,
    color: 'text-slate-600 hover:text-blue-600',
    activeColor: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    name: 'Profile',
    href: '/dashboard/profile', 
    icon: UserIcon,
    color: 'text-slate-600 hover:text-slate-600',
    activeColor: 'text-slate-600',
    bgColor: 'bg-slate-100'
  }
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/50 shadow-lg z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-between px-1 py-2 max-w-sm mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <div key={item.href} className="flex-1 max-w-[4rem]">
              <Link href={item.href}>
                <div className={`
                  relative flex flex-col items-center justify-center p-1 rounded-2xl
                  ${isActive ? item.activeColor : item.color}
                `}>
                  {item.isCenter ? (
                    // Central scan button
                    <div className="relative">
                      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full" />
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Regular nav item */}
                      <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isActive ? `${item.bgColor} ${item.activeColor}` : item.color}
                        `}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  )}
                  
                  {/* Label */}
                  {!item.isCenter && (
                    <span className={`
                        text-[10px] font-medium mt-1 leading-tight text-center
                        ${isActive ? item.activeColor : 'text-slate-600'}
                      `}
                    >
                      {item.name}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}


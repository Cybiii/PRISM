'use client'

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  BeakerIcon,
  ChartBarIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import {
  UserGroupIcon as UserGroupIconSolid,
  HomeIcon as HomeIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid,
  BeakerIcon as BeakerIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  EyeIcon as EyeIconSolid
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Animation imports removed for performance

// Map of links to display in the side navigation.
const links = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid, color: 'bg-blue-600' },
  { name: 'Readings', href: '/dashboard/readings', icon: DocumentDuplicateIcon, iconSolid: DocumentDuplicateIconSolid, color: 'bg-blue-700' },
  { name: 'Scan', href: '/dashboard/scan', icon: BeakerIcon, iconSolid: BeakerIconSolid, color: 'bg-blue-500' },
  { name: 'Insights', href: '/dashboard/insights', icon: ChartBarIcon, iconSolid: ChartBarIconSolid, color: 'bg-blue-800' },
  { name: 'Summary', href: '/dashboard/summary', icon: EyeIcon, iconSolid: EyeIconSolid, color: 'bg-blue-600' },
  { name: 'Profile', href: '/dashboard/profile', icon: UserIcon, iconSolid: UserIconSolid, color: 'bg-slate-600' }
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
      {links.map((link) => {
        const LinkIcon = link.icon
        const LinkIconSolid = link.iconSolid
        const isActive = pathname === link.href

        return (
          <div key={link.name}>
            <Link href={link.href}>
              <div                 className={`
                  group flex items-center rounded-xl px-4 py-3 text-sm font-medium
                  ${
                    isActive
                      ? `${link.color} text-white shadow-lg`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className="relative mr-3">
                  {isActive ? (
                    <div>
                      <LinkIconSolid className="h-6 w-6" />
                    </div>
                  ) : (
                    <LinkIcon className="h-6 w-6 group-hover:scale-110" />
                  )}
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                
                <span className="truncate">{link.name}</span>
                
                {/* Hover effect */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gray-50 opacity-0 group-hover:opacity-100 -z-10" />
                )}
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

"use client"; 

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  EyeIcon, // Reusing for Investigations
  BellIcon,
  CloudArrowUpIcon, // New icon for Data Ingestion
  CogIcon,
  // HomeIcon, // No longer used for 'Dashboard'
  // CommandLineIcon, // No longer used for 'SIEM Queries'
  // DocumentTextIcon, // No longer used for 'Reporting'
  // LockClosedIcon, // No longer used
  // UserGroupIcon, // No longer used
  // ShieldCheckIcon, // No longer used
  // TruckIcon, // No longer used
  // CloudIcon // No longer used
} from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname(); // Get current path

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navItems = [
    { href: '/', label: 'Search & Explore', icon: MagnifyingGlassIcon },
    { href: '/dashboards', label: 'Dashboards', icon: ChartBarIcon },
    { href: '/investigations', label: 'Investigations', icon: EyeIcon },
    { href: '/alerts', label: 'Detections', icon: BellIcon },
    { href: '/ingestion', label: 'Data Ingestion', icon: CloudArrowUpIcon },
    { href: '/settings', label: 'Settings', icon: CogIcon },
  ];

  return (
    <aside className={`bg-gray-700 text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col`}>
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && <span className="font-semibold text-lg">Navigation</span>}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon className="h-6 w-6" /> : <ChevronLeftIcon className="h-6 w-6" />}
        </button>
      </div>
      <nav className="flex-grow">
        <ul>
          {navItems.map((item: any) => { // Added :any to item to allow isSubItem
            const isActive = pathname === item.href;
            // For sub-items, we want the main /visualizations link to appear active if any sub-item's href matches the current path,
            // but the sub-item itself should only be "active" if its specific label is the one being "viewed" (though href is the same).
            // However, since all hrefs are currently /visualizations, this specific highlighting for sub-items isn't directly possible yet
            // without changing hrefs or adding more state to manage active sub-tab.
            // isActive will be true if the current pathname matches the item's href.
            // No special sub-item logic is needed anymore.
            return (
              <li key={item.label} className="mb-1 mx-2">
                <Link href={item.href} legacyBehavior>
                  <a
                    className={`group flex items-center p-3 rounded-md transition-colors duration-150 ease-in-out
                               ${isCollapsed ? 'justify-center' : ''}
                               ${isActive
                                 ? 'bg-blue-600 text-white shadow-lg'
                                 : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                               }`}
                  >
                    <item.icon className={`h-6 w-6 ${!isCollapsed ? 'mr-3' : ''} ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-600">
          <p className="text-xs text-gray-400">EventLog Analyzer v0.1</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
